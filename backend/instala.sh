#!/bin/bash

echo "========================================"
echo " Instalando Lili Boutique en Termux...  "
echo "========================================"

# 1. Instalar herramientas base (Modo 100% Silencioso)
echo "[1/5] Instalando Node.js y Git..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
pkg install nodejs git -y

# 2. Descargar tu código desde GitHub
echo "[2/5] Clonando el repositorio..."
git clone https://github.com/eduarbermudezz/sistema-lili-boutique.git mi_sistema
cd mi_sistema

# 3. Crear el .env del FRONTEND y compilar
echo "[3/5] Configurando y compilando el Frontend (React/Vite)..."
# Suponiendo que el frontend está en la raíz o en una carpeta específica. 
# Ajustaremos esto asumiendo que está en la raíz de "mi_sistema"
cat << 'EOF' > .env
VITE_API_URL=http://localhost:8080
EOF

# Instalamos dependencias del frontend y compilamos
npm install
npm run build

# 4. Crear el .env del BACKEND
echo "[4/5] Configurando el Backend (Node/Express)..."
cd backend # Entramos a la carpeta del backend

cat << 'EOF' > .env
PORT=8080
JWT_SECRET=MiSuperSecretoSeguroParaElSistemaLiliBoutique!
DB_HOST=gateway01.us-east-1.prod.aws.tidbcloud.com
DB_USER=3hRRsg35s7t4tcc.root
DB_PASSWORD=cxGh5fNOYsaykYoR
DB_NAME=sistema_lili
DB_PORT=4000
GOOGLE_CLIENT_ID=656412769485-inkodkdkpn5k6bmepntpu904k6v0vuh8.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REFRESH_TOKEN=1//04SzKyTALGPRECgYIARAAGAQSNwF-L9IrsnuZbljwXgEBqX98Id-46rwVWMS4zqYeCgjjM_i0h2QJR8nTg5gCKHsZdvRLe0IAeJw
GOOGLE_DRIVE_FOLDER_ID=17X58XY09ExZm9-pE1D-nlBlqevD3RSE5
API_BCV_URL=https://www.bcv.org.ve/
API_EXCHANGE_URL=https://api.exchangerate-api.com/v4/latest/USD
EOF

# Instalamos las dependencias del backend
npm install

# 5. Programar el arranque automático
echo "[5/5] Configurando el inicio automático..."
cat << 'EOF' > ~/.bashrc
clear
echo "Iniciando Lili Boutique..."
# Vamos directamente a la carpeta del backend donde está server.js
cd ~/mi_sistema/backend
node server.js
EOF

echo "========================================"
echo " ¡Instalación completada con éxito!     "
echo " Cierra esta ventana y vuelve a abrir   "
echo " Termux para arrancar el servidor.      "
echo "========================================"