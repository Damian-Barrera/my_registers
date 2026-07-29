import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: 'localhost',
    user : 'admin',
    password: '1234',
    database : 'my_registers',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

export default pool;