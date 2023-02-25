# API Kółko i krzyżyk

API do gry w kółko i krzyżyk, które tworzymy na zajęciach CoderDojo.

# Uruchamianie
1. Zainstaluj [Node.js](https://nodejs.org/)
2. Zainstaluj [PostgreSQL](https://www.postgresql.org/) lub poproś nas o dostęp do bazy danych (tylko dla członków CoderDojo)
3. Sklonuj repozytorium: `git clone git@github.com:INGcoderdojoMicrobit/kolkoikrzyzykAPI.git`
4. Przejdź do katalogu z repozytorium: `cd kolkoikrzyzykAPI`
5. Zainstaluj biblioteki: `npm install`
6. Uruchom `npx prisma db push` (przy zmianach struktury bazy danych) lub `npx prisma generate`
7. Uruchom serwer: `npm run tsnode` (development) lub `npm run start` (produkcja)