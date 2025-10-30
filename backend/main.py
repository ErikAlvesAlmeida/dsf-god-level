import duckdb
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

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
        AVG(delivery_seconds / 60) AS avg_tempo_entrega_min
    FROM fct_sales;
    """
    return run_query(query)

@app.get("/api/v2/reports/sales_by_store")
async def get_sales_by_store():
    """Sua pergunta: QUAL LOJA VENDEU MAIS/MENOS"""
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
    """Sua pergunta: QUAL CANAL VENDEU MAIS/MENOS"""
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
    """Sua pergunta: QUAL MÊS EU VENDI MAIS/MENOS"""
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
    """Sua pergunta: QUAL PRODUTO MAIS VENDEU"""
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

@app.get("/api/v2/reports/sales_by_payment_type")
async def get_sales_by_payment_type():
    """Sua pergunta: QUANTO EU VENDI EM..."""
    query = """
    SELECT
        COALESCE(payment_type, 'Não Identificado') AS forma_pagamento,
        SUM(sale_total_amount) AS faturamento
    FROM fct_sales
    GROUP BY forma_pagamento
    ORDER BY faturamento DESC;
    """
    return run_query(query)

@app.get("/api/v2/reports/delivery_by_neighborhood")
async def get_delivery_by_neighborhood():
    """Sua pergunta: TEMPO MÉDIO POR BAIRRO"""
    query = """
    SELECT
        delivery_neighborhood,
        AVG(delivery_seconds / 60) AS tempo_medio_min,
        COUNT(sale_id) AS total_entregas
    FROM fct_sales
    WHERE channel_type = 'D' AND delivery_neighborhood IS NOT NULL
    GROUP BY delivery_neighborhood
    HAVING total_entregas > 5 -- Remove bairros com pouquíssimas entregas
    ORDER BY tempo_medio_min DESC
    LIMIT 20;
    """
    return run_query(query)

@app.get("/api/v2/reports/sales_by_day_stacked")
async def get_sales_by_day_stacked(mes_ano: str):
    """
    Sua feature: Gráfico clicável (Drill-down por mês).
    Retorna o faturamento por dia, empilhado por canal, para um mês específico.
    """
    print(f"Buscando dados de drill-down para: {mes_ano}")
    
    query = f"""
    SELECT
        data_venda,
        channel_name,
        SUM(sale_total_amount) AS faturamento
    FROM fct_sales
    WHERE mes_ano = ?  -- Usamos '?' para segurança
    GROUP BY data_venda, channel_name
    ORDER BY data_venda, channel_name;
    """
    
    # --- Lógica de Execução com Parâmetros ---
    try:
        conn = duckdb.connect(database=DUCKDB_FILE, read_only=True)
        # Passa o 'mes_ano' como um parâmetro seguro
        result = conn.execute(query, [mes_ano]).df().to_dict(orient='records')
        conn.close()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao consultar o Data Mart: {str(e)}")

@app.get("/api/v2/reports/delivery_by_neighborhood")
async def get_delivery_by_neighborhood(order_by_asc: bool = False): # Default é Pior (DESC)
    """
    Sua pergunta: TEMPO MÉDIO POR BAIRRO
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
# --- FIM DOS ENDPOINTS ---

@app.get("/")
async def read_root():
    return {"status": "Analytics API está no ar!"}