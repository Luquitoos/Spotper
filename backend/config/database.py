import pyodbc
SERVER = r'.\SQLEXPRESS'  
DATABASE = 'SpotPer'
CONEXAO_STRING = (
    f'DRIVER={{ODBC Driver 18 for SQL Server}};'
    f'SERVER={SERVER};'
    f'DATABASE={DATABASE};'
    f'Trusted_Connection=yes;'
    f'Encrypt=yes;'
    f'TrustServerCertificate=yes;'
)
def get_conexao():
    # Retorna uma nova conexão com o banco de dados
    try:
        return pyodbc.connect(CONEXAO_STRING)
    except Exception as e:
        print(f"Erro ao conectar ao banco de dados: {e}")
        raise
__all__ = ['get_conexao', 'DATABASE', 'SERVER', 'CONEXAO_STRING']
