import fs from 'fs';
import path from 'path';

async function download() {
  const dataDir = path.join(process.cwd(), 'src', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log('Downloading world-atlas countries-110m.json...');
  const mapRes = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
  if (!mapRes.ok) throw new Error(`Map download failed: ${mapRes.statusText}`);
  const mapData = await mapRes.json();
  fs.writeFileSync(path.join(dataDir, 'countries-110m.json'), JSON.stringify(mapData, null, 2));
  console.log('Successfully saved countries-110m.json!');

  console.log('Downloading ISO-3166 country regional codes all.json...');
  const isoRes = await fetch('https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json');
  if (!isoRes.ok) throw new Error(`ISO codes download failed: ${isoRes.statusText}`);
  const isoData = await isoRes.json();
  fs.writeFileSync(path.join(dataDir, 'iso-countries.json'), JSON.stringify(isoData, null, 2));
  console.log('Successfully saved iso-countries.json!');
}

download().catch(err => {
  console.error('Error downloading map data:', err);
  process.exit(1);
});
