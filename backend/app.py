from flask import Flask, jsonify
from flask_cors import CORS
from routes import registrar_rotas
from config.database import DATABASE

def criar_app():
    # Cria e configura a aplicação Flask
    app = Flask(__name__)
    CORS(app)  
    @app.route('/api/health', methods=['GET'])
    def health():
        # Verifica se o backend está funcionando
        return jsonify({
            'status': 'ok', 
            'message': 'Backend SpotPer funcionando!',
            'database': DATABASE
        })
    registrar_rotas(app)
    return app
app = criar_app()
if __name__ == '__main__':
    print("=" * 50)
    print("  SpotPer Backend - Iniciando...")
    print("=" * 50)
    print(f"  Servidor: http://localhost:5001")
    print(f"  Banco: {DATABASE}")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5001, debug=True)
