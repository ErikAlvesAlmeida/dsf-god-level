# ⚡ Quick Start - 5 Minutos

ATENÇÃO: essa é uma sugestão de setup, não é obrigatório que se rode dessa maneira. O script base para geração de dados está em ./generate_data.py.

## Setup Completo

```bash
# 1. Clone
git clone https://github.com/ErikAlvesAlmeida/dsf-god-level.git
cd dsf-god-level


docker compose down -v 2>/dev/null || true
docker compose build --no-cache data-generator
docker compose up -d postgres
docker compose run --rm data-generator
docker compose --profile tools up -d pgadmin
```

**Aguarde 5-15 minutos** enquanto 500k vendas são geradas.

## Verifique

```bash
docker compose exec postgres psql -U challenge challenge_db -c 'SELECT COUNT(*) FROM sales;'

# Deve mostrar ~500k
```

## Crie o ambiente virtual

```bash
cd backend
python3 -m venv venv

```

## Ative o ambiente virtual

```bash
source venv/bin/activate
```

## Instale todas as dependências inicie as variáveis de ambiente

```bash
pip install -r requirements.txt
```

## Inicie as variáveis de ambiente

```bash
echo "DATABASE_URL=postgresql://challenge:challenge_2024@localhost:5432/challenge_db" > .env
```

## Por fim, rode o script ``etl.py``

```bash
python etl.py
```

**Aguarde alguns minutos** enquanto otimizamos nossas consultas.
**Espere até ver:** ``--- Processo ETL v4 (Otimizado) Concluído ---``.

## Abra um novo terminal, navegue até /frontend e baixe as dependências (Deixe o terminal 1 com o Docker).

```bash
cd frontend
npm install
```

## Para rodar tudo, confira:

**Terminal 1 (Docker)**: Já deve estar rodando.

**Terminal 2 (Backend API)** - Abra um novo terminal se não tiver aberto:

```bash
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 3 (Frontend UI)**: Abra um novo terminal se não tiver aberto:

```bash
cd frontend
npm run dev
```

## Explore

Explore os dados gerados da forma como quiser e julgar mais eficiente. Navegue pelas tableas e entenda seus relacionamentos.

## Estrutura dos Dados

```
Sale
├── ProductSale (produtos)
│   └── ItemProductSale (customizações: +bacon, -cebola)
├── Payment (formas de pagamento)
└── DeliverySale (delivery)
    └── DeliveryAddress (com lat/long)
```

**Schema completo**: [DADOS.md](./initial_information/DADOS.md)

## Próximos Passos

1. **Entenda o problema**: Leia [PROBLEMA.md](./initial_information/PROBLEMA.md)
2. **Explore os dados**: Rode queries, veja padrões

---

**Setup completo! Já pode acessar o site!🚀**
