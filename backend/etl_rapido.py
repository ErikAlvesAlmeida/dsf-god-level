import os
import duckdb
import pandas as pd
import psycopg2
from dotenv import load_dotenv

# --- QUERY 1: FCT_SALES (Grão: Venda) ---
# Usada para KPIs de alto nível: Faturamento, Descontos, Pagamentos, Clientes, Entrega
FCT_SALES_QUERY = """
WITH sales_base AS (
    SELECT
        s.id AS sale_id,
        s.created_at AS sale_created_at,
        
        -- === NOVAS COLUNAS DE DATA ===
        EXTRACT(DOW FROM s.created_at) AS dia_da_semana, -- (0=Dom, ... 6=Sab)
        CASE 
            WHEN EXTRACT(DOW FROM s.created_at) = 0 THEN 'Domingo'
            WHEN EXTRACT(DOW FROM s.created_at) = 1 THEN 'Segunda'
            WHEN EXTRACT(DOW FROM s.created_at) = 2 THEN 'Terça'
            WHEN EXTRACT(DOW FROM s.created_at) = 3 THEN 'Quarta'
            WHEN EXTRACT(DOW FROM s.created_at) = 4 THEN 'Quinta'
            WHEN EXTRACT(DOW FROM s.created_at) = 5 THEN 'Sexta'
            WHEN EXTRACT(DOW FROM s.created_at) = 6 THEN 'Sábado'
        END AS dia_da_semana_nome,
        TO_CHAR(s.created_at, 'YYYY-MM') AS mes_ano,
        EXTRACT(HOUR FROM s.created_at) AS hora_do_dia,
        DATE(s.created_at) AS data_venda,
        CASE
            WHEN EXTRACT(HOUR FROM s.created_at) BETWEEN 0 AND 5 THEN 'Madrugada'
            WHEN EXTRACT(HOUR FROM s.created_at) BETWEEN 6 AND 11 THEN 'Manhã'
            WHEN EXTRACT(HOUR FROM s.created_at) BETWEEN 12 AND 17 THEN 'Almoço'
            WHEN EXTRACT(HOUR FROM s.created_at) BETWEEN 18 AND 23 THEN 'Jantar'
        END AS periodo_do_dia,
        -- === FIM DAS NOVAS COLUNAS ===

        s.sale_status_desc,
        s.total_amount AS sale_total_amount,
        s.total_discount,
        s.discount_reason,
        s.delivery_fee,
        s.service_tax_fee,
        s.production_seconds,
        s.delivery_seconds,

        -- Dimensões
        st.name AS store_name,
        st.city AS store_city,
        ch.name AS channel_name,
        ch.type AS channel_type, -- 'P' Presencial, 'D' Delivery
        s.customer_id,
        da.neighborhood AS delivery_neighborhood,
        da.city AS delivery_city,
        
        -- Dimensão de Pagamento (ainda com a limitação de 1)
        (SELECT pt.description 
         FROM payments p 
         JOIN payment_types pt ON p.payment_type_id = pt.id 
         WHERE p.sale_id = s.id 
         LIMIT 1) AS payment_type
    FROM
        sales s
    JOIN stores st ON s.store_id = st.id
    JOIN channels ch ON s.channel_id = ch.id
    LEFT JOIN delivery_addresses da ON s.id = da.sale_id
    WHERE
        s.sale_status_desc = 'COMPLETED'
    -- APLICA A AMOSTRAGEM (PLANO C)
    AND s.id <= 50000 
)
SELECT * FROM sales_base;
"""

# --- QUERY 2: FCT_PRODUCT_SALES (Grão: Produto Vendido) ---
# Usada para análises de Mix de Produto, Categorias, etc.
FCT_PRODUCT_SALES_QUERY = """
WITH products_base AS (
    SELECT
        ps.sale_id,
        p.id AS product_id,
        p.name AS product_name,
        cat.name AS product_category,
        ps.quantity AS product_quantity,
        ps.base_price AS product_base_price,
        ps.total_price AS product_total_price,
        
        -- Agregando customizações (items)
        STRING_AGG(i.name, ', ') AS items_names,
        SUM(ips.additional_price) AS items_total_additional_price
    FROM
        product_sales ps
    JOIN products p ON ps.product_id = p.id
    LEFT JOIN categories cat ON p.category_id = cat.id
    LEFT JOIN item_product_sales ips ON ps.id = ips.product_sale_id
    LEFT JOIN items i ON ips.item_id = i.id
    GROUP BY
        ps.sale_id, p.id, p.name, cat.name, ps.quantity, ps.base_price, ps.total_price
),
-- Traz as dimensões da venda (data, loja, canal) para o nível do produto
sales_dims AS (
    SELECT
        s.id AS sale_id,
        s.created_at AS sale_created_at,
        TO_CHAR(s.created_at, 'YYYY-MM') AS mes_ano,
        DATE(s.created_at) AS data_venda,
        st.name AS store_name,
        ch.name AS channel_name,
        ch.type AS channel_type,
        da.neighborhood AS delivery_neighborhood
    FROM
        sales s
    JOIN stores st ON s.store_id = st.id
    JOIN channels ch ON s.channel_id = ch.id
    LEFT JOIN delivery_addresses da ON s.id = da.sale_id
    WHERE
        s.sale_status_desc = 'COMPLETED'
    -- APLICA A MESMA AMOSTRAGEM (PLANO C)
    AND s.id <= 50000 
)
SELECT
    sd.*,
    pb.product_id,
    pb.product_name,
    pb.product_category,
    pb.product_quantity,
    pb.product_base_price,
    pb.product_total_price,
    pb.items_names
FROM
    sales_dims sd
JOIN
    products_base pb ON sd.sale_id = pb.sale_id
;
"""

def process_etl_in_chunks(db_url: str, duckdb_file: str, query: str, table_name: str, chunk_size: int = 100000):
    """
    Executa o ETL processando os dados em "chunks" (pedaços)
    para evitar o esgotamento de memória RAM.
    """
    print(f"\nIniciando processamento para: {table_name}")
    
    conn_pg = None
    conn_duckdb = None
    
    try:
        conn_pg = psycopg2.connect(db_url)
        conn_duckdb = duckdb.connect(database=duckdb_file, read_only=False)
        
        is_first_chunk = True
        
        print(f"Iniciando extração em chunks de {chunk_size} linhas...")
        
        chunk_iterator = pd.read_sql_query(
            query,
            conn_pg,
            chunksize=chunk_size
        )
        
        total_rows = 0
        
        for i, chunk_df in enumerate(chunk_iterator):
            if chunk_df.empty:
                print(f"Chunk {i+1} está vazio. Finalizando.")
                break
                
            print(f"  > Processando Chunk {i+1} ({len(chunk_df)} linhas)...")
            conn_duckdb.register('chunk_temp', chunk_df)
            
            if is_first_chunk:
                conn_duckdb.execute(f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM chunk_temp")
                print(f"  ✓ Tabela '{table_name}' criada com o primeiro chunk.")
                is_first_chunk = False
            else:
                conn_duckdb.execute(f"INSERT INTO {table_name} SELECT * FROM chunk_temp")
                print(f"  ✓ Chunk {i+1} anexado à tabela '{table_name}'.")
            
            total_rows += len(chunk_df)

        if total_rows == 0:
             print("Nenhum dado foi processado.")
             return

        count_result = conn_duckdb.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()
        if count_result:
            print(f"✓ Verificação: {count_result[0]} linhas totais na tabela '{table_name}'.")
        
    except Exception as e:
        print(f"\n--- ERRO DURANTE O PROCESSO ETL ({table_name}) ---")
        print(f"Erro: {e}")
    
    finally:
        if conn_pg:
            conn_pg.close()
        if conn_duckdb:
            conn_duckdb.close()

def main():
    """Função principal do pipeline ETL."""
    load_dotenv() 
    
    DB_URL = os.getenv("DATABASE_URL")
    if not DB_URL:
        print("Erro: DATABASE_URL não definida no .env")
        return

    DUCKDB_FILE = 'analytics.duckdb'
    
    if os.path.exists(DUCKDB_FILE):
        print(f"Removendo arquivo DuckDB antigo: {DUCKDB_FILE}")
        os.remove(DUCKDB_FILE)

    # --- RODA O ETL PARA AS DUAS TABELAS ---
    # 1. Tabela de Vendas (Grão: Venda)
    process_etl_in_chunks(DB_URL, DUCKDB_FILE, FCT_SALES_QUERY, table_name='fct_sales')
    
    # 2. Tabela de Produtos Vendidos (Grão: Produto)
    process_etl_in_chunks(DB_URL, DUCKDB_FILE, FCT_PRODUCT_SALES_QUERY, table_name='fct_product_sales')
    
    print("\n--- Processo ETL v3 Concluído ---")
    print(f"Arquivo '{DUCKDB_FILE}' atualizado com 2 tabelas.")
    print("Conexão com PostgreSQL fechada.")
    print("Conexão com DuckDB fechada.")

if __name__ == "__main__":
    main()