import os, re
from werkzeug.utils import secure_filename
from flask import Flask, render_template, request, redirect, url_for, session, send_from_directory, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///nutri_ai.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = 'nutri_ai_secret_key_2024'  # Ganti dengan secret key yang lebih kuat
db = SQLAlchemy(app)

# Initialize Flask-Migrate
migrate = Migrate(app, db)

# Tentukan folder untuk menyimpan gambar
UPLOAD_FOLDER = os.path.join('static', 'images')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Pastikan folder upload ada
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Memeriksa ekstensi file yang diizinkan
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Route untuk mengakses gambar yang sudah di-upload                                                                                                                                                                         
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    print(f"Request for file: {filename}")
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    umur = db.Column(db.Integer, nullable=False)
    tb = db.Column(db.Integer, nullable=False)
    bb = db.Column(db.Integer, nullable=False)
    profile_picture = db.Column(db.String(200), nullable=True)
    tujuan = db.Column(db.String(50), nullable=False)
    aktivitas = db.Column(db.String(50), nullable=False)
    tipe_tubuh = db.Column(db.String(50), nullable=False)
    gender = db.Column(db.String(10), nullable=False)
    bmr = db.Column(db.Float, nullable=True)
    tdee = db.Column(db.Float, nullable=True)
    foods = db.relationship('Food', backref='user', lazy=True)

class Food(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nama_makanan = db.Column(db.String(120), nullable=False)
    porsi = db.Column(db.Integer, default=1)
    protein = db.Column(db.Integer, nullable=False)
    kalori = db.Column(db.Integer, nullable=False)
    image = db.Column(db.String(200))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    input_from = db.Column(db.String(50))

    def to_dict(self):
        return {
            "id": self.id,
            "nama_makanan": self.nama_makanan,
            "porsi": self.porsi,
            "protein": self.protein,
            "kalori": self.kalori,
            "image": self.image,
            "input_from": self.input_from
        }

class WaktuMakan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    waktu_makan = db.Column(db.String(50), nullable=False)
    food_id = db.Column(db.Integer, db.ForeignKey('food.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    tanggal = db.Column(db.Date, default=datetime.utcnow().date)

    food = db.relationship('Food', backref='waktu_makan_entries', lazy=True)
    user = db.relationship('User', backref='waktu_makan_entries', lazy=True)

    def __repr__(self):
        return f'<WaktuMakan {self.waktu_makan}>'
    
# Model untuk Laporan
class Laporan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    food_id = db.Column(db.Integer, db.ForeignKey('food.id', name='fk_laporan_food_id'), nullable=True)
    waktu_makan = db.Column(db.String(50), nullable=False)
    tanggal = db.Column(db.DateTime, default=datetime.utcnow)
    total_protein = db.Column(db.Integer, nullable=False)
    total_kalori = db.Column(db.Integer, nullable=False)

    food = db.relationship('Food', backref='laporan', lazy=True)
    user = db.relationship('User', backref='laporan', lazy=True)

    def __repr__(self):
        return f'<Laporan {self.id} - {self.tanggal}>'

with app.app_context():
    db.create_all()

@app.route('/')
def home():
    return render_template('register.html')

@app.route('/profile/<username>')
def profile(username):
    if 'username' not in session:
        return redirect(url_for('login'))
    user = User.query.filter_by(username=username).first_or_404()
    return render_template('profile.html', user=user)

@app.route('/update_profile_picture', methods=['POST'])
def update_profile_picture():
    if 'username' not in session:
        return jsonify({'status': 'error', 'message': 'User not logged in'}), 401
    
    if 'profile_picture' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file part'}), 400
        
    file = request.files['profile_picture']
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'No selected file'}), 400
        
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Tambahkan timestamp untuk mencegah conflict nama file
        timestamp = str(int(datetime.now().timestamp()))
        name, ext = os.path.splitext(filename)
        filename = f"{name}_{timestamp}{ext}"
        
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        try:
            file.save(file_path)
            print(f"File saved to: {file_path}")

            user = User.query.filter_by(username=session.get('username')).first_or_404()
            
            # Hapus file lama jika ada
            if user.profile_picture:
                old_file_path = os.path.join(app.config['UPLOAD_FOLDER'], user.profile_picture)
                if os.path.exists(old_file_path):
                    os.remove(old_file_path)
            
            user.profile_picture = filename
            db.session.commit()

            return jsonify({
                'status': 'success', 
                'profile_picture_url': url_for('uploaded_file', filename=filename)
            })

        except Exception as e:
            db.session.rollback()
            return jsonify({'status': 'error', 'message': f'Error uploading file: {str(e)}'}), 500

    return jsonify({'status': 'error', 'message': 'File type not allowed'}), 400

@app.route('/register', methods=['POST'])
def register():
    try:
        # Validasi input
        required_fields = ['username', 'password', 'umur', 'tb', 'bb', 'gender', 'aktivitas', 'tujuan']
        for field in required_fields:
            if field not in request.form or not request.form[field]:
                return jsonify({'error': f'Field {field} is required'}), 400

        # Cek apakah username sudah ada
        existing_user = User.query.filter_by(username=request.form['username']).first()
        if existing_user:
            return jsonify({'error': 'Username already exists'}), 400

        # Ambil data dari form
        umur = int(request.form['umur'])
        tb = int(request.form['tb'])
        bb = int(request.form['bb'])
        gender = request.form['gender']
        aktivitas = request.form['aktivitas']
        tujuan = request.form['tujuan']
        tipe_tubuh = request.form.get('body_type', 'mesomorph')

        # Validasi rentang nilai
        if not (10 <= umur <= 100):
            return jsonify({'error': 'Age must be between 10 and 100'}), 400
        if not (100 <= tb <= 250):
            return jsonify({'error': 'Height must be between 100 and 250 cm'}), 400
        if not (30 <= bb <= 300):
            return jsonify({'error': 'Weight must be between 30 and 300 kg'}), 400

        # Hitung BMR menggunakan rumus Mifflin-St Jeor
        if gender == 'laki_laki':
            bmr = 10 * bb + 6.25 * tb - 5 * umur + 5
        else:
            bmr = 10 * bb + 6.25 * tb - 5 * umur - 161

        # Menentukan faktor aktivitas berdasarkan pilihan pengguna
        activity_factors = {
            'sangat_tidak_aktif': 1.2,
            'aktivitas_ringan': 1.375,
            'aktivitas_sedang': 1.55,
            'aktivitas_berat': 1.725
        }
        
        tdee = bmr * activity_factors.get(aktivitas, 1.375)

        # Penyesuaian berdasarkan tipe tubuh
        body_type_factors = {
            'ectomorph': 1.1,
            'mesomorph': 1.0,
            'endomorph': 0.9
        }
        
        tdee *= body_type_factors.get(tipe_tubuh, 1.0)

        # Membuat objek user
        user = User(
            username=request.form['username'],
            password=generate_password_hash(request.form['password']),
            umur=umur,
            tb=tb,
            bb=bb,
            tujuan=tujuan,
            aktivitas=aktivitas,
            gender=gender,
            tipe_tubuh=tipe_tubuh,
            bmr=bmr,
            tdee=tdee
        )
        
        db.session.add(user)
        db.session.commit()

        session['username'] = user.username
        return redirect(url_for('dashboard', username=user.username))
        
    except ValueError as e:
        return jsonify({'error': 'Invalid input format'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Fungsi untuk menambahkan pemisah ribuan
@app.template_filter('format_number')
def format_number(value):
    try:
        return "{:,.0f}".format(value)
    except (ValueError, TypeError):
        return value
    
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if not username or not password:
            return render_template('login.html', error='Username and password are required')
        
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            session['username'] = user.username
            return redirect(url_for('dashboard', username=user.username))
        else:
            return render_template('login.html', error='Invalid username or password')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login'))

@app.route('/dashboard/<username>')
def dashboard(username):
    if 'username' not in session:
        return redirect(url_for('login'))
    
    user = User.query.filter_by(username=username).first_or_404()
    
    # Pastikan user hanya bisa akses dashboard sendiri
    if session['username'] != username:
        return redirect(url_for('dashboard', username=session['username']))

    # Ambil BMR dan TDEE dari database
    bmr = user.bmr or 0
    tdee = user.tdee or 0

    # Menentukan target kalori berdasarkan tujuan
    if user.tujuan == 'bulking':
        target_calories = tdee + 300  # Surplus kalori untuk bulking
        target_protein = user.bb * 2.2  # Protein tinggi untuk bulking
    elif user.tujuan == 'cutting':
        target_calories = tdee - 300  # Defisit kalori untuk cutting
        target_protein = user.bb * 2.5  # Protein tinggi untuk mempertahankan otot
    else:  # maintain
        target_calories = tdee  # Target kalori sesuai TDEE
        target_protein = user.bb * 2.0  # Protein maintenance
    
    # Ambil data makanan hari ini
    today = datetime.now().date()
    
    # Query makanan berdasarkan waktu makan untuk hari ini
    makanan_pagi = WaktuMakan.query.join(Food).filter(
        WaktuMakan.waktu_makan == 'Pagi',
        WaktuMakan.user_id == user.id,
        WaktuMakan.tanggal == today,
        Food.input_from == 'input makanan'
    ).all()
    
    makanan_siang = WaktuMakan.query.join(Food).filter(
        WaktuMakan.waktu_makan == 'Siang',
        WaktuMakan.user_id == user.id,
        WaktuMakan.tanggal == today,
        Food.input_from == 'input makanan'
    ).all()
    
    makanan_sore = WaktuMakan.query.join(Food).filter(
        WaktuMakan.waktu_makan == 'Sore',
        WaktuMakan.user_id == user.id,
        WaktuMakan.tanggal == today,
        Food.input_from == 'input makanan'
    ).all()
    
    makanan_malam = WaktuMakan.query.join(Food).filter(
        WaktuMakan.waktu_makan == 'Malam',
        WaktuMakan.user_id == user.id,
        WaktuMakan.tanggal == today,
        Food.input_from == 'input makanan'
    ).all()

    # Fungsi untuk menghitung total protein dan kalori
    def calculate_total(waktu_list):
        protein_total = sum((w.food.protein or 0) for w in waktu_list)
        kalori_total = sum((w.food.kalori or 0) for w in waktu_list)
        return protein_total, kalori_total

    # Hitung total per waktu makan
    total_protein_pagi, total_kalori_pagi = calculate_total(makanan_pagi)
    total_protein_siang, total_kalori_siang = calculate_total(makanan_siang)
    total_protein_sore, total_kalori_sore = calculate_total(makanan_sore)
    total_protein_malam, total_kalori_malam = calculate_total(makanan_malam)
    
    # Total keseluruhan hari ini
    total_protein_input = total_protein_pagi + total_protein_siang + total_protein_sore + total_protein_malam
    total_kalori_input = total_kalori_pagi + total_kalori_siang + total_kalori_sore + total_kalori_malam
    
    # Menghitung progress
    progress_calories = min(round((total_kalori_input / target_calories) * 100, 1), 100) if target_calories > 0 else 0
    progress_protein = min(round((total_protein_input / target_protein) * 100, 1), 100) if target_protein > 0 else 0

    # Status target
    target_status_calories = "Sudah tercapai" if total_kalori_input >= target_calories else "Belum tercapai"
    target_status_protein = "Sudah tercapai" if total_protein_input >= target_protein else "Belum tercapai"

    return render_template('dashboard.html',
                           user=user,
                           bmr=int(round(bmr)),
                           tdee=int(round(tdee)),
                           target_calories=int(round(target_calories)),
                           target_protein=int(round(target_protein)),
                           total_protein_input_makanan=total_protein_input,
                           total_kalori_input_makanan=total_kalori_input,
                           total_protein_pagi=total_protein_pagi,
                           total_kalori_pagi=total_kalori_pagi,
                           total_protein_siang=total_protein_siang,
                           total_kalori_siang=total_kalori_siang,
                           total_protein_sore=total_protein_sore,
                           total_kalori_sore=total_kalori_sore,
                           total_protein_malam=total_protein_malam,
                           total_kalori_malam=total_kalori_malam,
                           makanan_pagi=makanan_pagi,
                           makanan_siang=makanan_siang,
                           makanan_sore=makanan_sore,
                           makanan_malam=makanan_malam,
                           progress_calories=progress_calories,
                           progress_protein=progress_protein,
                           target_status_calories=target_status_calories,
                           target_status_protein=target_status_protein)

@app.route('/input_makanan/<username>', methods=['GET', 'POST'])
def input_makanan(username):
    if 'username' not in session:
        return redirect(url_for('login'))

    user = User.query.filter_by(username=session['username']).first()
    if not user:
        return redirect(url_for('login'))

    if request.method == 'POST':
        try:
            nama_makanan = request.form.get('nama_makanan', '').strip()
            porsi = request.form.get('porsi', '0')
            protein = request.form.get('protein', '0')
            kalori = request.form.get('kalori', '0')
            waktu_makan = request.form.get('waktu_makan', '')

            # Validasi input
            if not nama_makanan or not porsi or int(porsi) <= 0:
                return jsonify({'status': 'error', 'message': 'Nama makanan dan porsi harus valid'}), 400

            # Buat food entry
            f = Food(
                nama_makanan=nama_makanan,
                porsi=int(porsi),
                protein=int(protein),
                kalori=int(kalori),
                user_id=user.id,
                input_from="input makanan"
            )
            db.session.add(f)
            db.session.commit()

            # Buat waktu makan entry
            waktu_makan_entry = WaktuMakan(
                waktu_makan=waktu_makan,
                food_id=f.id,
                user_id=user.id,
                tanggal=datetime.now().date()
            )
            db.session.add(waktu_makan_entry)
            db.session.commit()

            return redirect(url_for('dashboard', username=username))
        
        except Exception as e:
            db.session.rollback()
            return jsonify({'status': 'error', 'message': str(e)}), 500

    # GET request - tampilkan form
    foods_data = [f.to_dict() for f in Food.query.filter_by(input_from="tambah data").all()]
    return render_template('input_makanan.html', user=user, foods_data=foods_data)

@app.route('/submit_to_dashboard', methods=['POST'])
def submit_to_dashboard():
    if 'username' not in session:
        return jsonify({'status': 'error', 'message': 'User not logged in'}), 401
        
    try:
        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'No data received'}), 400

        user = User.query.filter_by(username=session.get('username')).first_or_404()
        today = datetime.now().date()

        for item in data:
            # Validasi item
            required_keys = ['nama_makanan', 'porsi', 'protein', 'kalori', 'waktu_makan']
            if not all(key in item for key in required_keys):
                continue

            # Create food entry
            f = Food(
                nama_makanan=item['nama_makanan'],
                porsi=int(item['porsi']),
                protein=int(re.sub(r'\D', '', str(item['protein']))),
                kalori=int(re.sub(r'\D', '', str(item['kalori']))),
                user_id=user.id,
                input_from="input makanan",
                image=item.get('image', '')
            )
            db.session.add(f)
            db.session.flush()  # Flush to get the ID

            # Create waktu makan entry
            waktu_makan_entry = WaktuMakan(
                waktu_makan=item['waktu_makan'],
                food_id=f.id,
                user_id=user.id,
                tanggal=today
            )
            db.session.add(waktu_makan_entry)
        
        db.session.commit()
        return jsonify({'status': 'success'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/tambah_data/<username>', methods=['GET', 'POST'])
def tambah_data(username):
    if 'username' not in session:
        return redirect(url_for('login'))
        
    user = User.query.filter_by(username=username).first_or_404()

    if request.method == 'POST':
        try:
            nama_makanan = request.form.get('nama_makanan', '').strip()
            protein = request.form.get('protein', '0')
            kalori = request.form.get('kalori', '0')

            if not nama_makanan:
                return jsonify({'error': 'Nama makanan wajib diisi'}), 400

            # Handle file upload
            filename = None
            if 'food_image' in request.files:
                file = request.files['food_image']
                if file and file.filename and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    timestamp = str(int(datetime.now().timestamp()))
                    name, ext = os.path.splitext(filename)
                    filename = f"{name}_{timestamp}{ext}"
                    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

            f = Food(
                nama_makanan=nama_makanan,
                protein=int(protein),
                kalori=int(kalori),
                image=filename,
                user_id=None,
                input_from="tambah data"
            )
            db.session.add(f)
            db.session.commit()

            return redirect(url_for('input_makanan', username=username))
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

    return render_template('tambah_data.html', user=user)

@app.route('/laporan/<username>', methods=['GET'])
def laporan(username):
    if 'username' not in session:
        return redirect(url_for('login'))
        
    user = User.query.filter_by(username=username).first_or_404()
    
    # Ambil laporan berdasarkan user_id dan urutkan berdasarkan tanggal
    laporan_data = Laporan.query.filter_by(user_id=user.id).order_by(Laporan.tanggal.desc()).all()
    
    return render_template('laporan.html', user=user, laporan_data=laporan_data)

@app.route('/submit_laporan/<username>', methods=['POST'])
def submit_laporan(username):
    if 'username' not in session:
        return redirect(url_for('login'))
        
    user = User.query.filter_by(username=username).first_or_404()
    today = datetime.now().date()

    try:
        # Ambil semua makanan hari ini
        waktu_makan_hari_ini = WaktuMakan.query.join(Food).filter(
            WaktuMakan.user_id == user.id,
            WaktuMakan.tanggal == today,
            Food.input_from == 'input makanan'
        ).all()

        # Hitung total protein dan kalori
        total_protein = sum(w.food.protein * w.food.porsi for w in waktu_makan_hari_ini)
        total_kalori = sum(w.food.kalori * w.food.porsi for w in waktu_makan_hari_ini)

        # Buat laporan
        laporan = Laporan(
            user_id=user.id,
            waktu_makan='Hari Ini',
            total_protein=total_protein,
            total_kalori=total_kalori,
            tanggal=datetime.now()
        )

        db.session.add(laporan)
        db.session.commit()

        return redirect(url_for('laporan', username=username))
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/reset_and_report', methods=['POST'])
def reset_and_report():
    if 'username' not in session:
        return redirect(url_for('login'))
        
    user = User.query.filter_by(username=session['username']).first_or_404()
    today = datetime.now().date()

    try:
        # Ambil makanan hari ini
        waktu_makan_hari_ini = WaktuMakan.query.join(Food).filter(
            WaktuMakan.user_id == user.id,
            WaktuMakan.tanggal == today,
            Food.input_from == 'input makanan'
        ).all()

        if waktu_makan_hari_ini:
            # Hitung total
            total_protein = sum(w.food.protein * w.food.porsi for w in waktu_makan_hari_ini)
            total_kalori = sum(w.food.kalori * w.food.porsi for w in waktu_makan_hari_ini)

            # Buat laporan
            laporan = Laporan(
                user_id=user.id,
                waktu_makan='Hari Ini',
                total_protein=total_protein,
                total_kalori=total_kalori,
                tanggal=datetime.now()
            )
            db.session.add(laporan)

            # Hapus data hari ini
            for w in waktu_makan_hari_ini:
                db.session.delete(w.food)
                db.session.delete(w)

            db.session.commit()

        return redirect(url_for('laporan', username=user.username))
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return redirect(url_for('login'))

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)