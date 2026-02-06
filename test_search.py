
import database

database.init_db()
query = "B.Tech"
result = database.search_notices(query)
print(f"Query: {query}")
print(f"Result: {result['title'] if result else 'None'}")

query = "BUS"
result = database.search_notices(query)
print(f"Query: {query}")
print(f"Result: {result['title'] if result else 'None'}")

query = "Java"
result = database.search_notices(query)
print(f"Query: {query}")
print(f"Result: {result['title'] if result else 'None'}")

query = "When is the Java exam?"
result = database.search_notices(query)
print(f"Query: {query}")
print(f"Result: {result['title'] if result else 'None'}")
