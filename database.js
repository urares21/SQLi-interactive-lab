const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'vulnerable_lab.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting with the database.', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// all in one function
function initializeDatabase() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS TipuriCamera (id INTEGER PRIMARY KEY AUTOINCREMENT, denumire TEXT, pret REAL)`);
        db.run(`CREATE TABLE IF NOT EXISTS Camere (id INTEGER PRIMARY KEY AUTOINCREMENT, numar TEXT, id_tip INTEGER, FOREIGN KEY(id_tip) REFERENCES TipuriCamera(id))`);
        db.run(`CREATE TABLE IF NOT EXISTS Clienti (id INTEGER PRIMARY KEY AUTOINCREMENT, nume TEXT, email TEXT, parola TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS DetaliiClient (id INTEGER PRIMARY KEY AUTOINCREMENT, id_client INTEGER, telefon TEXT, card_credit TEXT, FOREIGN KEY(id_client) REFERENCES Clienti(id))`);
        db.run(`CREATE TABLE IF NOT EXISTS Rezervari (id INTEGER PRIMARY KEY AUTOINCREMENT, id_client INTEGER, id_camera INTEGER, data_sosire TEXT, data_plecare TEXT, FOREIGN KEY(id_client) REFERENCES Clienti(id), FOREIGN KEY(id_camera) REFERENCES Camere(id))`);

        // delete old data
        db.run(`DELETE FROM Rezervari`);
        db.run(`DELETE FROM DetaliiClient`);
        db.run(`DELETE FROM Clienti`);
        db.run(`DELETE FROM Camere`);
        db.run(`DELETE FROM TipuriCamera`);
        
        // reset id number to 1
        db.run(`DELETE FROM sqlite_sequence`);

        // reenter clean data
        db.run(`INSERT INTO TipuriCamera (denumire, pret) VALUES ('Standard', 200), ('Deluxe', 350)`);
        db.run(`INSERT INTO Camere (numar, id_tip) VALUES ('101', 1), ('201', 2)`);
        db.run(`INSERT INTO Clienti (nume, email, parola) VALUES ('Admin', 'admin@hotel.com', 'SuperSecret123')`);
        db.run(`INSERT INTO Clienti (nume, email, parola) VALUES ('Ion Popescu', 'ion@test.com', 'parola123')`);
        db.run(`INSERT INTO DetaliiClient (id_client, telefon, card_credit) VALUES (1, '0700000000', '1234-5678-9012-3456')`);
        db.run(`INSERT INTO DetaliiClient (id_client, telefon, card_credit) VALUES (2, '0711111111', '1111-2222-3333-4444')`);
        
    console.log("Database successfully (re)initialized!");    });
}

initializeDatabase();

module.exports = { db, initializeDatabase };