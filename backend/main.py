import duckdb
import os                 
import psycopg2           
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from dotenv import load_dotenv 

load_dotenv()
POSTGRES_DB_URL = os.getenv("DATABASE_URL")
if not POSTGRES_DB_URL:
    print("ALERTA: DATABASE_URL do Postgres não encontrada no .env")

# --- Configuração da API ---
app = FastAPI(
    title="Analytics API v2 (Curada)",
    description="API com endpoints pré-definidos para o dashboard.",
    version="2.0.0"
)

origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Conexão com o DuckDB ---
DUCKDB_FILE = 'analytics.duckdb'

def run_query(query: str):
    """Helper para rodar uma query no DuckDB e retornar como JSON."""
    try:
        conn = duckdb.connect(database=DUCKDB_FILE, read_only=True)
        result = conn.execute(query).df().to_dict(orient='records')
        conn.close()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao consultar o Data Mart: {str(e)}")

# --- Endpoints de Relatórios (Mapeados para o seu Roadmap) ---

@app.get("/api/v2/reports/kpi_summary")
async def get_kpi_summary():
    """Retorna os KPIs principais (Cards)."""
    query = """
    SELECT
        SUM(sale_total_amount) AS faturamento_total,
        AVG(sale_total_amount) AS ticket_medio,
        COUNT(sale_id) AS total_vendas,
        AVG(delivery_seconds / 60) AS avg_tempo_entrega_min,
        SUM(total_discount) AS total_descontos
    FROM fct_sales;
    """
    return run_query(query)


@app.get("/api/v2/data/stores_list")
async def get_stores_list():
    """
    Retorna uma lista simples de todos os nomes de lojas.
    Para o seu novo 'Select-box'.
    """
    query = """
    SELECT DISTINCT store_name
    FROM fct_sales
    ORDER BY store_name;
    """
    return run_query(query)


@app.get("/api/v2/reports/sales_by_store")
async def get_sales_by_store():
    """QUAL LOJA VENDEU MAIS/MENOS"""
    query = """
    SELECT
        store_name,
        SUM(sale_total_amount) AS faturamento,
        COUNT(sale_id) AS total_vendas
    FROM fct_sales
    GROUP BY store_name
    ORDER BY faturamento DESC;
    """
    return run_query(query)

@app.get("/api/v2/reports/sales_by_channel")
async def get_sales_by_channel():
    """QUAL CANAL VENDEU MAIS/MENOS"""
    query = """
    SELECT
        channel_name,
        SUM(sale_total_amount) AS faturamento,
        COUNT(sale_id) AS total_vendas
    FROM fct_sales
    GROUP BY channel_name
    ORDER BY faturamento DESC;
    """
    return run_query(query)

@app.get("/api/v2/reports/sales_by_month")
async def get_sales_by_month():
    """QUAL MÊS EU VENDI MAIS/MENOS"""
    query = """
    SELECT
        mes_ano,
        SUM(sale_total_amount) AS faturamento
    FROM fct_sales
    GROUP BY mes_ano
    ORDER BY mes_ano;
    """
    return run_query(query)

@app.get("/api/v2/reports/top_products_by_revenue")
async def get_top_products_by_revenue():
    """QUAL PRODUTO MAIS VENDEU"""
    query = """
    SELECT
        product_name,
        SUM(product_total_price) AS faturamento
    FROM fct_product_sales
    GROUP BY product_name
    ORDER BY faturamento DESC
    LIMIT 20;
    """
    return run_query(query)

@app.get("/api/v2/reports/worst_products_by_revenue")
async def get_worst_products_by_revenue():
    """
    QUAL PRODUTO MENOS VENDEU
    (O "oposto" do Top Produtos)
    """
    query = """
    SELECT
        product_name,
        SUM(product_total_price) AS faturamento
    FROM fct_product_sales
    GROUP BY product_name
    ORDER BY faturamento ASC 
    LIMIT 20;
    """
    return run_query(query)

@app.get("/api/v2/reports/sales_by_payment_type")
async def get_sales_by_payment_type():
    """QUANTO EU VENDI EM..."""
    query = """
    SELECT
        COALESCE(payment_type, 'Não Identificado') AS forma_pagamento,
        SUM(sale_total_amount) AS faturamento
    FROM fct_sales
    GROUP BY forma_pagamento
    ORDER BY faturamento DESC;
    """
    return run_query(query)

@app.get("/api/v2/reports/sales_by_day_stacked")
async def get_sales_by_day_stacked(mes_ano: str, store_name: Optional[str] = None):
    """
    Feature: Gráfico clicável (Drill-down por mês).
    Retorna o faturamento por dia, empilhado por canal.
    AGORA TAMBÉM FILTRA POR LOJA, se 'store_name' for fornecido.
    """
    print(f"Buscando dados de drill-down para: {mes_ano}, Loja: {store_name}")
    
    # Lista de parâmetros para a query segura
    params = [mes_ano]
    
    query = f"""
    SELECT
        data_venda,
        channel_name,
        SUM(sale_total_amount) AS faturamento
    FROM fct_sales
    WHERE mes_ano = ? 
    """

    # Adiciona o filtro de loja SÓ SE ele for passado
    if store_name:
        query += " AND store_name = ? "
        params.append(store_name)
        
    query += """
    GROUP BY data_venda, channel_name
    ORDER BY data_venda, channel_name;
    """
    
    # --- Lógica de Execução com Parâmetros ---
    try:
        conn = duckdb.connect(database=DUCKDB_FILE, read_only=True)
        # Passa a lista de parâmetros (1 ou 2)
        result = conn.execute(query, params).df().to_dict(orient='records')
        conn.close()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao consultar o Data Mart: {str(e)}")

@app.get("/api/v2/reports/delivery_by_neighborhood")
async def get_delivery_by_neighborhood(order_by_asc: bool = False):
    """
    TEMPO MÉDIO POR BAIRRO
    Adicionado parâmetro 'order_by_asc' para Piores (False) ou Melhores (True).
    """
    order_clause = "ASC" if order_by_asc else "DESC"
    
    query = f"""
    SELECT
        delivery_neighborhood,
        AVG(delivery_seconds / 60) AS tempo_medio_min,
        COUNT(sale_id) AS total_entregas
    FROM fct_sales
    WHERE channel_type = 'D' AND delivery_neighborhood IS NOT NULL
    GROUP BY delivery_neighborhood
    HAVING total_entregas > 5
    ORDER BY tempo_medio_min {order_clause}
    LIMIT 20;
    """
    return run_query(query)

@app.get("/api/v2/reports/sales_by_month_for_store")
async def get_sales_by_month_for_store(store_name: str):
    """
    Feature: Drill-down por Loja.
    Retorna o faturamento por mês para uma loja específica.
    """
    print(f"Buscando dados de drill-down para a loja: {store_name}")
    
    query = f"""
    SELECT
        mes_ano,
        SUM(sale_total_amount) AS faturamento
    FROM fct_sales
    WHERE store_name = ?  -- Filtra pela loja
    GROUP BY mes_ano
    ORDER BY mes_ano;
    """
    
    try:
        conn = duckdb.connect(database=DUCKDB_FILE, read_only=True)
        # Passa o 'store_name' como um parâmetro seguro
        result = conn.execute(query, [store_name]).df().to_dict(orient='records')
        conn.close()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao consultar o Data Mart: {str(e)}")

@app.get("/api/v2/reports/top_products_by_channel")
async def get_top_products_by_channel(channel_name: str):
    """
    Feature: Drill-down por Canal.
    Retorna o faturamento por produto para um canal específico.
    """
    print(f"Buscando Top Produtos para o Canal: {channel_name}")
    
    query = f"""
    SELECT
        product_name,
        SUM(product_total_price) AS faturamento,
        SUM(product_quantity) AS quantidade
    FROM fct_product_sales
    WHERE channel_name = ?  -- Filtra pelo canal
    GROUP BY product_name
    ORDER BY faturamento DESC
    LIMIT 20;
    """
    
    try:
        conn = duckdb.connect(database=DUCKDB_FILE, read_only=True)
        result = conn.execute(query, [channel_name]).df().to_dict(orient='records')
        conn.close()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao consultar o Data Mart: {str(e)}")

@app.get("/api/v2/reports/top_products_by_store")
async def get_top_products_by_store(store_name: str, mes_ano: Optional[str] = None):
    """
    Feature B: Drill-down por Loja para Produtos.
    aceita um 'mes_ano' opcional para "cross-filtering".
    """
    print(f"Buscando Top Produtos para Loja: {store_name}, Mês: {mes_ano}")
    
    params = [store_name] # Parâmetro 1 (obrigatório)
    
    query = f"""
    SELECT
        product_name,
        SUM(product_total_price) AS faturamento,
        SUM(product_quantity) AS quantidade
    FROM fct_product_sales
    WHERE store_name = ?  -- Filtra pela LOJA
    """
    
    # --- (Cross-filter) ---
    if mes_ano:
        query += " AND mes_ano = ? "
        params.append(mes_ano) # Parâmetro 2 (opcional)
        
    query += """
    GROUP BY product_name
    ORDER BY faturamento DESC
    LIMIT 20;
    """
    
    try:
        conn = duckdb.connect(database=DUCKDB_FILE, read_only=True)
        # Passa a lista de parâmetros (1 ou 2)
        result = conn.execute(query, params).df().to_dict(orient='records')
        conn.close()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao consultar o Data Mart: {str(e)}")

@app.get("/api/v2/reports/kpi_summary_for_store")
async def get_kpi_summary_for_store(store_name: str):
    """
    Feature: KPIs para o dashboard de detalhe da loja.
    """
    print(f"Buscando KPIs para a Loja: {store_name}")
    
    query = f"""
    SELECT
        SUM(sale_total_amount) AS faturamento_total,
        AVG(sale_total_amount) AS ticket_medio,
        COUNT(sale_id) AS total_vendas,
        AVG(delivery_seconds / 60) AS avg_tempo_entrega_min
    FROM fct_sales
    WHERE store_name = ?;
    """
    try:
        conn = duckdb.connect(database=DUCKDB_FILE, read_only=True)
        result = conn.execute(query, [store_name]).df().to_dict(orient='records')
        conn.close()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao consultar o Data Mart: {str(e)}")

@app.get("/api/v2/reports/sales_by_channel_detail")
async def get_sales_by_channel_detail(store_name: str, mes_ano: str):
    """
    Drill-down Mês -> Canal
    Retorna o faturamento por canal PARA UMA LOJA E MÊS específicos.
    """
    print(f"Buscando Vendas por Canal para Loja: {store_name}, Mês: {mes_ano}")
    
    params = [store_name, mes_ano]
    
    query = f"""
    SELECT
        channel_name,
        SUM(sale_total_amount) AS faturamento
    FROM fct_sales
    WHERE store_name = ? AND mes_ano = ?
    GROUP BY channel_name
    ORDER BY faturamento DESC;
    """
    
    try:
        conn = duckdb.connect(database=DUCKDB_FILE, read_only=True)
        result = conn.execute(query, params).df().to_dict(orient='records')
        conn.close()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao consultar o Data Mart: {str(e)}")

@app.get("/api/v2/reports/customer_segmentation")
async def get_customer_segmentation(
    order_by_asc: bool = False,
    at_risk: bool = False
):
    print(f"Buscando Clientes: order_by_asc={order_by_asc}, at_risk={at_risk}")
    
    order_clause = "ASC" if order_by_asc else "DESC"
    
    having_clause = ""
    if at_risk:
        # CORRIGIDO: Converte sale_created_at para TIMESTAMP antes de comparar
        having_clause = "HAVING COUNT(sale_id) >= 3 AND MAX(sale_created_at::TIMESTAMP) < (NOW() - INTERVAL '30 days')"
    
    query_stats = f"""
    SELECT
        customer_id,
        COUNT(sale_id) AS total_vendas,
        MAX(DATE(sale_created_at)) AS ultima_compra_data
    FROM fct_sales
    WHERE customer_id IS NOT NULL
    GROUP BY customer_id
    {having_clause}
    ORDER BY total_vendas {order_clause}
    LIMIT 100;
    """
    
    conn_duckdb = None
    conn_postgres = None
    
    try:
        conn_duckdb = duckdb.connect(database=DUCKDB_FILE, read_only=True)
        stats_df = conn_duckdb.execute(query_stats).fetchdf()
        
        if stats_df.empty:
            return []

        customer_ids = tuple(stats_df['customer_id'].tolist())

        if not POSTGRES_DB_URL:
            raise HTTPException(status_code=500, detail="DATABASE_URL do Postgres não configurada")
        
        conn_postgres = psycopg2.connect(POSTGRES_DB_URL)
        cur = conn_postgres.cursor()
        
        query_details = f"""
        SELECT
            id,
            customer_name,
            COALESCE(phone_number, email) AS contato
        FROM customers
        WHERE id IN %s; 
        """
        
        cur.execute(query_details, (customer_ids,))
        details_data = cur.fetchall()

        details_df = pd.DataFrame(details_data, columns=['customer_id', 'nome_cliente', 'contato'])
        
        final_df = pd.merge(stats_df, details_df, on='customer_id')
        
        final_df = final_df[['nome_cliente', 'contato', 'total_vendas', 'ultima_compra_data']]
        final_df['ultima_compra_data'] = final_df['ultima_compra_data'].astype(str)
        
        return final_df.to_dict(orient='records')

    except Exception as e:
        print(f"ERRO SQL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório de clientes: {str(e)}")
    finally:
        if conn_duckdb: conn_duckdb.close()
        if conn_postgres: conn_postgres.close()
# --- FIM DOS ENDPOINTS ---

@app.get("/")
async def read_root():
    return {"status": "Analytics API está no ar!"}