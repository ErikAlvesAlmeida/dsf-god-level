import os
import duckdb
import pandas as pd
import psycopg2
from dotenv import load_dotenv

# Query SQL para "achatar" (flatten) os dados.
# Esta é a nossa transformação (o "T" do ETL).
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
        -- Usamos LEFT JOIN para incluir produtos que NÃO têm items
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

def extract_from_postgres(query: str, db_url: str) -> pd.DataFrame:
    """Extrai dados do PostgreSQL e retorna um DataFrame."""
    print("Conectando ao PostgreSQL...")
    try:
        conn = psycopg2.connect(db_url)
        print("Conexão estabelecida. Extraindo dados (isso pode levar alguns minutos)...")
        
        # pd.read_sql para carregar dados diretamente em um DataFrame
        df = pd.read_sql_query(query, conn)
        
        print(f"✓ Extração concluída. {len(df)} linhas de 'product_sales' achatadas.")
        return df
    except Exception as e:
        print(f"Erro ao conectar ou extrair do PostgreSQL: {e}")
        return pd.DataFrame() # Retorna DF vazio em caso de erro
    finally:
        if 'conn' in locals() and conn:
            conn.close()
            print("Conexão com PostgreSQL fechada.")

def load_to_duckdb(df: pd.DataFrame, db_file: str, table_name: str):
    """Carrega um DataFrame em uma tabela do DuckDB."""
    if df.empty:
        print("DataFrame vazio. Nenhum dado para carregar.")
        return

    print(f"Conectando ao DuckDB (arquivo: {db_file})...")
    conn = duckdb.connect(db_file)
    print("Conexão estabelecida. Carregando dados...")
    
    # Registra o DataFrame como uma "tabela virtual"
    conn.register('df_temp', df)
    
    # Persiste os dados em uma tabela física no arquivo DuckDB
    # Isso é o que garante a performance
    conn.execute(f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM df_temp")
    
    print(f"✓ Dados carregados na tabela '{table_name}'.")
    
    # Verificação
    count = conn.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
    print(f"✓ Verificação: {count} linhas inseridas no DuckDB.")
    
    conn.close()
    print("Conexão com DuckDB fechada.")

def main():
    """Função principal do pipeline ETL."""
    load_dotenv() # Carrega variáveis do .env
    
    DB_URL = os.getenv("DATABASE_URL")
    if not DB_URL:
        print("Erro: DATABASE_URL não definida no .env")
        return

    DUCKDB_FILE = 'analytics.duckdb'
    TABLE_NAME = 'sales_mart'

    # 1. Extract
    df = extract_from_postgres(FLATTEN_SALES_QUERY, DB_URL)
    
    # 2. Load
    if not df.empty:
        load_to_duckdb(df, DUCKDB_FILE, TABLE_NAME)
        print("\n--- Processo ETL concluído com sucesso! ---")
        print(f"Arquivo '{DUCKDB_FILE}' criado/atualizado.")
    else:
        print("Processo ETL falhou ou não retornou dados.")

if __name__ == "__main__":
    main()