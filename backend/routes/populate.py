from flask import jsonify
from routes import populate_bp

@populate_bp.route('', methods=['POST'])
def executar_povoamento():
    # Endpoint para executar o povoamento do banco de dados
    try:
        from povoate import executar_povoamento as povoar
        resultado = povoar()
        
        if resultado:
            return jsonify({
                'success': True,
                'message': 'Banco de dados povoado com sucesso!'
            })
        else:
            return jsonify({
                'error': True,
                'message': 'Erro durante o povoamento'
            }), 500
            
    except Exception as e:
        return jsonify({
            'error': True,
            'message': str(e)
        }), 500
