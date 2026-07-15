import os
from datetime import timedelta

from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from app.models import db, run_safe_migrations
from app.routes import main_bp
from app.ai_routes import ai_bp


# ─────────────────────────────────────────────────────────
#  APP CONFIG
# ─────────────────────────────────────────────────────────
app = Flask(__name__)

# CORS: batasi origin di production via env variable
# Contoh .env: ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
_allowed_origins = os.environ.get('ALLOWED_ORIGINS', '*')
CORS(app, origins=_allowed_origins if _allowed_origins != '*' else '*')

DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///nutri_ai.db')
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI']        = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY']                 = os.environ.get('JWT_SECRET_KEY') or (_ for _ in ()).throw(RuntimeError('JWT_SECRET_KEY wajib diset di .env'))  # noqa
app.config['JWT_ACCESS_TOKEN_EXPIRES']       = timedelta(days=30)


# ─────────────────────────────────────────────────────────
#  EXTENSIONS
# ─────────────────────────────────────────────────────────
db.init_app(app)
migrate = Migrate(app, db)
jwt     = JWTManager(app)


# ─────────────────────────────────────────────────────────
#  BLUEPRINTS
# ─────────────────────────────────────────────────────────
app.register_blueprint(main_bp)
app.register_blueprint(ai_bp)


# ─────────────────────────────────────────────────────────
#  DB INIT + MIGRATION
# ─────────────────────────────────────────────────────────
with app.app_context():
    db.create_all()
    print("Running safe migrations...")
    run_safe_migrations()
    print("Database ready ✓")


# ─────────────────────────────────────────────────────────
#  ERROR HANDLERS
# ─────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint tidak ditemukan'}), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({'error': 'Method tidak diizinkan'}), 405


@app.errorhandler(500)
def server_error(e):
    db.session.rollback()
    return jsonify({'error': 'Terjadi kesalahan server'}), 500


@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({'error': 'Token expired', 'code': 'TOKEN_EXPIRED'}), 401


@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({'error': 'Token tidak valid', 'code': 'INVALID_TOKEN'}), 401


@jwt.unauthorized_loader
def unauthorized_callback(error):
    return jsonify({'error': 'Token tidak ditemukan', 'code': 'MISSING_TOKEN'}), 401


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)