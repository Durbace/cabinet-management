# Cabinet Manager — Angular responsive/mobile-first

Aplicație Angular pentru organizarea unui cabinet: pacienți, programări, ședințe, încasări, cheltuieli și rapoarte.

Varianta aceasta este refăcută pentru mobil:

- pe desktop păstrează tabelele normale;
- pe telefon listele devin carduri mari, fără scroll lateral;
- are meniu jos pe mobile;
- are butoane mari, potrivite pentru iPhone;
- păstrează și configurarea PWA, dar poate fi rulată și ca aplicație Angular normală.

## Rulare normală

```bash
npm install
npm start
```

Apoi deschide adresa afișată de Angular, de obicei:

```text
http://localhost:4200
```

## Test PWA local

```bash
npm run serve:pwa
```

Apoi deschide:

```text
http://127.0.0.1:8080
```

## Date demo

Aplicația folosește localStorage și date demo. Pentru GitHub sau CV, nu introduce date reale de pacienți.
