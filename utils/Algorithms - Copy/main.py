import os
from PIL import Image

# Current folder
input_folder = os.getcwd()
output_folder = os.path.join(input_folder, "output_1920x1080")

os.makedirs(output_folder, exist_ok=True)

WIDTH, HEIGHT = 1920, 1080  # target resolution

for filename in os.listdir(input_folder):
    if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff')):
        img_path = os.path.join(input_folder, filename)
        img = Image.open(img_path)

        # resize (force exact size)
        resized = img.resize((WIDTH, HEIGHT))

        # save output
        save_path = os.path.join(output_folder, filename)
        resized.save(save_path)

        print(f"Converted: {filename}")

print("✔ All images converted to 1920x1080.")
