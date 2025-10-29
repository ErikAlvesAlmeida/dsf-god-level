import os
import duckdb
import pandas as pd
import psycopg2
from dotenv import load_dotenv

FLATTEN_SALES_QUERY = """
WITH sales_base AS (
    SELECT
        s.id AS sale_id,
        s.created_at AS sale_created_at,
        s.sale_status_desc,
        s.total_amount AS sale_total_amount,
        s.total_discount,
        s.total_increase,
        s.delivery_fee,
        s.service_tax_fee,
        s.production_seconds,
        s.delivery_seconds,

        -- Dimensões da Venda
        st.name AS store_name,
        st.city AS store_city,
        st.state AS store_state,
        ch.name AS channel_name,
        ch.type AS channel_type, -- 'P' Presencial, 'D' Delivery
        c.id AS customer_id,
        da.neighborhood AS delivery_neighborhood,
        da.city AS delivery_city,
        da.state AS delivery_state,
        
        -- Pagamento (exemplo: pegar o primeiro tipo de pagamento)
        (SELECT pt.description 
         FROM payments p 
         JOIN payment_types pt ON p.payment_type_id = pt.id 
         WHERE p.sale_id = s.id 
         LIMIT 1) AS payment_type
    FROM
        sales s
    JOIN stores st ON s.store_id = st.id
    JOIN channels ch ON s.channel_id = ch.id
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN delivery_addresses da ON s.id = da.sale_id
    WHERE
        s.sale_status_desc = 'COMPLETED' -- Importante: Apenas vendas completas
),
products_base AS (
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
)
SELECT
    sb.*,
    pb.product_id,
    pb.product_name,
    pb.product_category,
    pb.product_quantity,
    pb.product_base_price,
    pb.product_total_price,
    pb.items_names,
    pb.items_total_additional_price
FROM
    sales_base sb
JOIN
    products_base pb ON sb.sale_id = pb.sale_id
;
"""

def process_etl_in_chunks(db_url: str, duckdb_file: str, table_name: str, chunk_size: int = 100000):
    """
    Executa o ETL processando os dados em "chunks" (pedaços)
    para evitar o esgotamento de memória RAM.
    """
    print("Iniciando processo ETL em modo 'chunked' (otimizado para RAM)...")
    
    conn_pg = None
    conn_duckdb = None
    
    try:
        # 1. Conectar ao PostgreSQL (Fonte)
        print("Conectando ao PostgreSQL...")
        conn_pg = psycopg2.connect(db_url)
        print("✓ Conexão com PostgreSQL estabelecida.")

        # 2. Conectar ao DuckDB (Destino)
        print(f"Conectando ao DuckDB (arquivo: {duckdb_file})...")
        conn_duckdb = duckdb.connect(database=duckdb_file, read_only=False)
        print("✓ Conexão com DuckDB estabelecida.")
        
        is_first_chunk = True
        
        # 3. Criar um iterador de chunks do Pandas
        print(f"Iniciando extração do PostgreSQL em chunks de {chunk_size} linhas...")
        
        # pd.read_sql_query com 'chunksize' retorna um iterador
        chunk_iterator = pd.read_sql_query(
            FLATTEN_SALES_QUERY,
            conn_pg,
            chunksize=chunk_size
        )
        
        total_rows = 0
        
        # 4. Loop de processamento de cada chunk
        for i, chunk_df in enumerate(chunk_iterator):
            if chunk_df.empty:
                print(f"Chunk {i+1} está vazio. Finalizando.")
                break
                
            print(f"  > Processando Chunk {i+1} ({len(chunk_df)} linhas)...")
            
            # Registra o chunk atual no DuckDB como uma tabela temporária
            conn_duckdb.register('chunk_temp', chunk_df)
            
            if is_first_chunk:
                # Na primeira vez, CRIA a tabela permanente
                conn_duckdb.execute(f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM chunk_temp")
                print(f"  ✓ Tabela '{table_name}' criada com o primeiro chunk.")
                is_first_chunk = False
            else:
                # Nas próximas, apenas ANEXA (append) os dados
                conn_duckdb.execute(f"INSERT INTO {table_name} SELECT * FROM chunk_temp")
                print(f"  ✓ Chunk {i+1} anexado à tabela '{table_name}'.")
            
            total_rows += len(chunk_df)

        if total_rows == 0:
             print("Nenhum dado foi processado. Verifique a query e o banco de dados.")
             return

        print("\n--- Processo ETL concluído com sucesso! ---")
        
        # 5. Verificação Final
        count_result = conn_duckdb.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()
        if count_result:
            print(f"✓ Verificação: {count_result[0]} linhas totais na tabela '{table_name}'.")
        
    except Exception as e:
        print(f"\n--- ERRO DURANTE O PROCESSO ETL ---")
        print(f"Erro: {e}")
    
    finally:
        # 6. Fechar conexões
        if conn_pg:
            conn_pg.close()
            print("Conexão com PostgreSQL fechada.")
        if conn_duckdb:
            conn_duckdb.close()
            print("Conexão com DuckDB fechada.")

def main():
    load_dotenv() # Carrega variáveis do .env
    
    DB_URL = os.getenv("DATABASE_URL")
    if not DB_URL:
        print("Erro: DATABASE_URL não definida no .env")
        return

    DUCKDB_FILE = 'analytics.duckdb'
    TABLE_NAME = 'sales_mart'
    CHUNK_SIZE = 100000  # 100 mil linhas por vez. Pode ajustar se necessário.

    # Limpa o arquivo antigo, se existir, para começar do zero.
    if os.path.exists(DUCKDB_FILE):
        print(f"Removendo arquivo DuckDB antigo: {DUCKDB_FILE}")
        os.remove(DUCKDB_FILE)

    process_etl_in_chunks(DB_URL, DUCKDB_FILE, TABLE_NAME, CHUNK_SIZE)

if __name__ == "__main__":
    main()