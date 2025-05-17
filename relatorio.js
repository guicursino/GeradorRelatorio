const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const PDFDocument = require('pdfkit');
const moment = require('moment');

const [,, inicio, fim] = process.argv;

if (!inicio || !fim) {
  console.error("Uso: node relatorio.js YYYY-MM-DD YYYY-MM-DD");
  process.exit(1);
}

const dbFile = 'visitas.db';
const dbExists = fs.existsSync(dbFile);
const db = new sqlite3.Database(dbFile);

// Se banco não existir, cria e popula com dados fictícios
if (!dbExists) {
  db.serialize(() => {
    db.run("CREATE TABLE visitas (id INTEGER PRIMARY KEY, data_entrada TEXT)");
    const stmt = db.prepare("INSERT INTO visitas (data_entrada) VALUES (?)");

    const datas = [
      '2025-05-01', '2025-05-01', '2025-05-03',
      '2025-05-05', '2025-05-07', '2025-05-10',
      '2025-05-15', '2025-05-18', '2025-05-20'
    ];

    datas.forEach(data => stmt.run(data));
    stmt.finalize();
    console.log("🛠️ Banco criado e populado com dados de teste.");

    gerarRelatorio();
  });
} else {
  gerarRelatorio();
}

function gerarRelatorio() {
  db.get(
    "SELECT COUNT(*) AS total FROM visitas WHERE data_entrada BETWEEN ? AND ?",
    [inicio, fim],
    (err, row) => {
      if (err) {
        console.error("Erro ao consultar banco:", err);
        return;
      }

      const total = row.total;
      const doc = new PDFDocument();
      const nomeArquivo = `relatorio_visitas_${inicio}_a_${fim}.pdf`;

      const stream = fs.createWriteStream(nomeArquivo);
      doc.pipe(stream);

      doc.fontSize(18).text('Relatório de Visitas', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Período: ${moment(inicio).format('DD/MM/YYYY')} a ${moment(fim).format('DD/MM/YYYY')}`);
      doc.moveDown();
      doc.fontSize(14).text(`Total de visitas no período: ${total}`);
      doc.end();

      stream.on('finish', () => {
        console.log(`✅ PDF gerado: ${nomeArquivo}`);
        db.close();
      });
    }
  );
}
