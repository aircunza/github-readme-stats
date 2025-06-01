import { execSync } from "child_process";
import fs from "fs";

async function testPush() {
  try {
    // Crear un archivo temporal
    const filename = "push-test-file.txt";
    fs.writeFileSync(filename, `Test push file - ${new Date().toISOString()}`);

    // Configurar git
    execSync('git config user.name "github-actions"');
    execSync('git config user.email "github-actions@github.com"');

    // Agregar archivo, commit y push
    execSync(`git add ${filename}`);
    execSync('git commit -m "Test push from GitHub Actions"');
    
    // La URL del remoto con el token debe estar configurada como variable de entorno GH_TOKEN
    execSync(`git remote set-url origin https://x-access-token:${process.env.GH_TOKEN}@github.com/aircunza/github-readme-stats.git`);
    execSync('git push origin HEAD:main');

    // Borrar archivo después del push para limpiar
    fs.unlinkSync(filename);

    // Commit para borrar el archivo y push
    execSync(`git add -u`);
    execSync('git commit -m "Cleanup push test file"');
    execSync('git push origin HEAD:main');

    console.log("Push test successful!");
  } catch (error) {
    console.error("Push test failed:", error.message);
  }
}

testPush();
