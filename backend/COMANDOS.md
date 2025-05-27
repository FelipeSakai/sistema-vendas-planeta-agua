### Subir com Docker
```bash
docker compose up --build
--------------------------------------------
Para o sistema 

docker compose down
--------------------------------------------
Limpeza Docker

docker compose down -v
--------------------------------------------
Testes Integracao

docker compose -f docker-compose.test.yml up --build --abort-on-container-exit

docker compose -f docker-compose.test.yml down -v
--------------------------------------------
Teste Unitario

npx jest tests/unit
--------------------------------------------
PRISMA 

npx prisma migrate dev
--------------------------------------------

