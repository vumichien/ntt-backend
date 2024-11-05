import pandas as pd
import shutil
import os
from faker import Faker

def generate_similar_excel_files(template_path, output_dir, num_files=83):
    # Tạo Faker instance với locale Nhật Bản
    fake = Faker(['ja_JP'])
    
    # Đảm bảo thư mục đầu ra tồn tại
    os.makedirs(output_dir, exist_ok=True)
    
    # Tạo 50 file với tên người khác nhau
    for i in range(num_files):
        # Tạo tên người ngẫu nhiên bằng romanji
        random_name = fake.romanized_name()
        df = pd.read_excel(template_path)
        df['user_name'] = random_name
        
        # Tạo tên file mới
        new_filename = f"UC1_UC1_新人_11_copy_{str(i+1).zfill(2)}.xlsx"
        new_filepath = os.path.join(output_dir, new_filename)
        
        # Lưu DataFrame vào file mới
        df.to_excel(new_filepath, index=False)
        
        print(f"Đã tạo file: {new_filename}")

# Sử dụng hàm - chỉ cần tên file vì đang ở trong cùng thư mục
template_file = "data/error_logs/UC1_UC1_新人_11.xlsx"
output_directory = "data/error_logs/"  # Thư mục hiện tại

# Kiểm tra file tồn tại
if not os.path.exists(template_file):
    print(f"Không tìm thấy file template tại: {template_file}")
    exit(1)

generate_similar_excel_files(template_file, output_directory)