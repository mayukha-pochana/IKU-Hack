from sqlalchemy import text
from app.db.session import engine

with engine.connect() as c:
    for r in c.execute(text("select table_name from information_schema.tables where table_schema='public' order by 1")):
        print(r[0])
