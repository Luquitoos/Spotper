# backend/routes/__init__.py
# Registro de todas as rotas (blueprints)

from flask import Blueprint

# Blueprints por entidade
periods_bp = Blueprint('periods', __name__)
composition_types_bp = Blueprint('composition_types', __name__)
interpreters_bp = Blueprint('interpreters', __name__)
labels_bp = Blueprint('labels', __name__)
composers_bp = Blueprint('composers', __name__)
albums_bp = Blueprint('albums', __name__)
tracks_bp = Blueprint('tracks', __name__)
playlists_bp = Blueprint('playlists', __name__)
queries_bp = Blueprint('queries', __name__)


def registrar_rotas(app):
    """Registra todos os blueprints na aplicação Flask."""
    # Importar rotas (evita import circular)
    from routes import periods
    from routes import composition_types
    from routes import interpreters
    from routes import labels
    from routes import composers
    from routes import albums
    from routes import tracks
    from routes import playlists
    from routes import queries
    
    # Registrar com prefixos de URL
    app.register_blueprint(periods_bp, url_prefix='/api/periods')
    app.register_blueprint(composition_types_bp, url_prefix='/api/composition-types')
    app.register_blueprint(interpreters_bp, url_prefix='/api/interpreters')
    app.register_blueprint(labels_bp, url_prefix='/api/labels')
    app.register_blueprint(composers_bp, url_prefix='/api/composers')
    app.register_blueprint(albums_bp, url_prefix='/api/albums')
    app.register_blueprint(tracks_bp, url_prefix='/api/tracks')
    app.register_blueprint(playlists_bp, url_prefix='/api/playlists')
    app.register_blueprint(queries_bp, url_prefix='/api/queries')
