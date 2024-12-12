# Gunakan image base yang memiliki Python
FROM python:3.9-slim

# Salin requirements.txt dan install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Salin model dan file lain ke container
COPY . .

# Tentukan port aplikasi
ENV PORT 8080
EXPOSE 8080

# Tentukan command untuk menjalankan aplikasi
CMD ["python", "main.py"]
