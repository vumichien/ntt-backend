import os
import shutil
import random

def copy_random_image(source_dir, dest_dir):
    image_files = [f for f in os.listdir(source_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]
    
    if not image_files:
        print(f"Không tìm thấy file ảnh nào trong {source_dir}")
        return
    
    for root, dirs, files in os.walk(dest_dir):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                random_image = random.choice(image_files)
                src_path = os.path.join(source_dir, random_image)
                dest_path = os.path.join(root, file)
                shutil.copy2(src_path, dest_path)
                print(f"Đã sao chép {random_image} thành {dest_path}")

source_dir = 'images'

dest_dirs = [
    'UC1',
    'UC2',
    'UC2.5',
    'UC3'
]

for dest_dir in dest_dirs:
    print(f"\nĐang xử lý thư mục {dest_dir}:")
    copy_random_image(source_dir, dest_dir)
