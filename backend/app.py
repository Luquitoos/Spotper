# backend/app.py
# Ponto de entrada do backend SpotPer
# Aplicação Flask modular - todas as rotas em arquivos separados

from flask import Flask, jsonify
from flask_cors import CORS
from routes import registrar_rotas
from config.database import DATABASE


def criar_app():
    """Cria e configura a aplicação Flask."""
    app = Flask(__name__)
    CORS(app)  # Permite requisições do frontend
    
    # Rota de health check
    @app.route('/api/health', methods=['GET'])
    def health():
        """Verifica se o backend está funcionando."""
        return jsonify({
            'status': 'ok', 
            'message': 'Backend SpotPer funcionando!',
            'database': DATABASE
        })
    
    # Registrar todas as rotas
    registrar_rotas(app)
    
    return app


# Aplicação principal
app = criar_app()


if __name__ == '__main__':
    print("=" * 50)
    print("  SpotPer Backend - Iniciando...")
    print("=" * 50)
    print(f"  Servidor: http://localhost:8080")
    print(f"  Banco: {DATABASE}")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=8080, debug=True)
