import duckdb
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel, Field
from typing import List, Dict, Any

# --- Configuração da API ---
app = FastAPI(
    title="Analytics API para Restaurantes",
    description="API para consultar o Data Mart de vendas (sales_mart).",
    version="1.0.0"
)

class Filter(BaseModel):
    """Define um filtro a ser aplicado na query."""
    field: str = Field(..., description="Coluna a ser filtrada. Ex: 'channel_name'")
    operator: str = Field(..., description="Operador. Ex: 'eq', 'in', 'gte', 'like'")
    value: Any = Field(..., description="Valor do filtro. Ex: 'iFood' ou [1, 2, 3]")

class QueryRequest(BaseModel):
    """Define a estrutura de uma requisição de consulta analítica."""
    metrics: List[str] = Field(..., description="Métricas a serem calculadas. Ex: ['SUM(sale_total_amount)', 'COUNT(DISTINCT sale_id)']")
    dimensions: List[str] = Field(..., description="Dimensões para agrupar (GROUP BY). Ex: ['store_name', 'channel_name']")
    filters: List[Filter] = Field([], description="Lista de filtros (WHERE).")
    order_by: Dict[str, str] = Field({}, description="Ordenação (ORDER BY). Ex: {'SUM_sale_total_amount': 'desc'}")
    limit: int = Field(100, description="Limite de linhas (LIMIT).")

    class Config:
        schema_extra = {
            "example": {
                "metrics": ["COUNT(DISTINCT sale_id) as total_vendas", "SUM(sale_total_amount) as faturamento"],
                "dimensions": ["store_name"],
                "filters": [
                    {"field": "channel_name", "operator": "eq", "value": "iFood"},
                    {"field": "sale_created_at", "operator": "gte", "value": "2025-10-01T00:00:00"}
                ],
                "order_by": {"faturamento": "desc"},
                "limit": 10
            }
        }

# --- Conexão com o Banco de Dados (DuckDB) ---
DUCKDB_FILE = 'analytics.duckdb'
TABLE_NAME = 'sales_mart'

def get_duckdb_conn():
    """Retorna uma conexão read-only com o DuckDB."""
    try:
        # read_only=True garante que a API não modifique os dados
        return duckdb.connect(database=DUCKDB_FILE, read_only=True)
    except Exception as e:
        # Isso vai falhar se o arquivo ainda não existir.
        print(f"Erro ao conectar ao DuckDB (o arquivo pode não existir ainda): {e}")
        raise HTTPException(status_code=503, detail="Data Mart indisponível. O ETL pode estar rodando.")

def build_sql(query: QueryRequest) -> str:
    
    metrics_str = ", ".join(query.metrics)
    dimensions_str = ", ".join(query.dimensions)
    
    sql = f"SELECT {metrics_str}, {dimensions_str} FROM {TABLE_NAME}"
    
    # 1. Cláusula WHERE (Filtros)
    where_clauses = []
    params = [] # Para "safe query execution" (evitar injection)
    
    if query.filters:
        for f in query.filters:
            # TODO: Adicionar mais operadores seguros (in, gte, lte, like)
            if f.operator.lower() == 'eq':
                where_clauses.append(f"{f.field} = ?")
                params.append(f.value)
            elif f.operator.lower() == 'gte':
                where_clauses.append(f"{f.field} >= ?")
                params.append(f.value)
            # Adicionar mais operadores aqui...
            
        if where_clauses:
            sql += " WHERE " + " AND ".join(where_clauses)
            
    # 2. Cláusula GROUP BY (Dimensões)
    if query.dimensions:
        sql += f" GROUP BY {dimensions_str}"
        
    # 3. Cláusula ORDER BY
    if query.order_by:
        order_parts = [f"{col} {direction.upper()}" for col, direction in query.order_by.items()]
        sql += " ORDER BY " + ", ".join(order_parts)
        
    # 4. Cláusula LIMIT
    sql += f" LIMIT {query.limit}"
    
    return sql, params


# --- O Endpoint da API ---

@app.post("/api/v1/query")
def execute_analytics_query(request: QueryRequest = Body(..., example=QueryRequest.Config.schema_extra["example"])):
    
    sql_query, params = build_sql(request)
    print(f"Executando SQL: {sql_query}")
    print(f"Com parâmetros: {params}")
    
    try:
        conn = get_duckdb_conn()
    except HTTPException as e:
        return e # Retorna 503 se o DB não estiver pronto

    try:
        # .df() retorna o resultado como um DataFrame Pandas,
        # que o FastAPI converte automaticamente para JSON.
        result_df = conn.execute(sql_query, params).df()
        
        # Converte para JSON no formato que o frontend espera
        result_json = result_df.to_dict(orient='records')
        
        return {
            "query_sql": sql_query,
            "params": params,
            "count": len(result_json),
            "data": result_json
        }
    except Exception as e:
        print(f"Erro ao executar query no DuckDB: {e}")
        # Retorna o erro SQL para o frontend (bom para debug)
        raise HTTPException(status_code=400, detail=f"Erro na query: {str(e)}")
    finally:
        conn.close()

@app.get("/")
def read_root():
    return {"status": "Analytics API está no ar!"}