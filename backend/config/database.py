# backend/config/database.py
# Configuração de conexão com SQL Server

import pyodbc

# Configuração da conexão - Windows Authentication
SERVER = 'localhost'  # Altere para seu servidor
DATABASE = 'BDSpotPer'

# String de conexão
CONEXAO_STRING = f'DRIVER={{ODBC Driver 18 for SQL Server}};SERVER={SERVER};DATABASE={DATABASE};Trusted_Connection=yes;'


def get_conexao():
    """Retorna uma nova conexão com o banco de dados."""
    return pyodbc.connect(CONEXAO_STRING)


# Exportar para uso em app.py
__all__ = ['get_conexao', 'DATABASE', 'SERVER', 'CONEXAO_STRING']
