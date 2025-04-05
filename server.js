const express = require( 'express' );
const sqlite3 = require( 'sqlite3' ).verbose();
const bcrypt = require( 'bcrypt' );
const jwt = require( 'jsonwebtoken' );
const cors = require( 'cors' );
const path = require( 'path' );
const fs = require( 'fs' ); // To read grapes_data.csv
const app = express();

app.use( express.json() );
app.use( cors( {
    origin: 'http://localhost:3000', // Update this for production (e.g., your deployed frontend URL)
    methods: [ 'GET', 'POST' ],
    allowedHeaders: [ 'Content-Type', 'Authorization' ]
} ) );
app.use( express.static( path.join( __dirname, 'public' ) ) );

app.get( '/', ( req, res ) =>
{
    res.sendFile( path.join( __dirname, 'public', 'index.html' ) );
} );

const db = new sqlite3.Database( 'database.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, ( err ) =>
{
    if ( err ) console.error( 'Database connection error:', err );
    else console.log( 'Connected to SQLite database' );
} );

// Function to retry table creation if database is busy
function createTable ( query, tableName, retries = 5, delay = 100 )
{
    db.run( query, ( err ) =>
    {
        if ( err )
        {
            if ( err.code === 'SQLITE_BUSY' && retries > 0 )
            {
                console.log( `Database busy, retrying ${ tableName } creation (${ retries } attempts left)...` );
                setTimeout( () => createTable( query, tableName, retries - 1, delay ), delay );
            } else
            {
                console.error( `${ tableName } table error:`, err );
            }
        } else
        {
            console.log( `${ tableName } table ready` );
        }
    } );
}

createTable( `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
)`, 'users' );

createTable( `CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`, 'contacts' );

// Load grapes_data.csv into memory (simple parsing as an example)
let grapeData = [];
const csvPath = 'grapes_data.csv';
if ( fs.existsSync( csvPath ) )
{
    const csvContent = fs.readFileSync( csvPath, 'utf-8' );
    const rows = csvContent.split( '\n' ).slice( 1 ); // Skip header
    rows.forEach( row =>
    {
        const [ GrapeType, Color, Price, Description, TasteProfile, Origin, Uses, Availability ] = row.split( ',' );
        if ( GrapeType )
        {
            grapeData.push( {
                GrapeType,
                Color,
                Price,
                Description,
                TasteProfile,
                Origin,
                Uses,
                Availability
            } );
        }
    } );
    console.log( 'Grape data loaded:', grapeData.length, 'entries' );
} else
{
    console.error( 'grapes_data.csv not found' );
}

// Function to get grape info
function getGrapeInfo ( index )
{
    const grape = grapeData[ index ] || {};
    return (
        `**Grape Type:** ${ grape.GrapeType || 'Unknown' }\n` +
        `**Color:** ${ grape.Color || 'Unknown' }\n` +
        `**Price:** ₹${ grape.Price || '0' } per 500g\n` +
        `**Description:** ${ grape.Description || 'No description' }\n` +
        `**Taste Profile:** ${ grape.TasteProfile || 'Unknown' }\n` +
        `**Origin:** ${ grape.Origin || 'Unknown' }\n` +
        `**Uses:** ${ grape.Uses || 'Unknown' }\n` +
        `**Availability:** ${ grape.Availability || 'Unknown' }`
    );
}

// Function to get response based on user input (simple keyword matching)
function getChatResponse ( userInput )
{
    userInput = userInput.toLowerCase().trim();
    console.log( 'Processing input:', userInput );
    const match = grapeData.find( grape =>
        grape.GrapeType.toLowerCase().includes( userInput ) ||
        grape.Description.toLowerCase().includes( userInput )
    );
    if ( match )
    {
        const index = grapeData.indexOf( match );
        return getGrapeInfo( index );
    }
    return "Sorry, I couldn’t find a match. Try asking about a specific grape (e.g., 'Thompson Seedless')!";
}

// Existing endpoints
app.post( '/signup', async ( req, res ) =>
{
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash( password, 10 );
    db.get( 'SELECT email FROM users WHERE email = ?', [ email ], ( err, row ) =>
    {
        if ( err ) return res.status( 500 ).json( { message: 'Database error' } );
        if ( row ) return res.status( 400 ).json( { message: 'Email already exists' } );
        db.run( 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [ username, email, hashedPassword ], ( err ) =>
            {
                if ( err ) return res.status( 500 ).json( { message: 'Error creating user' } );
                res.status( 201 ).json( { message: 'User created' } );
            } );
    } );
} );

app.post( '/login', ( req, res ) =>
{
    const { email, password } = req.body;
    db.get( 'SELECT * FROM users WHERE email = ?', [ email ], async ( err, user ) =>
    {
        if ( err ) return res.status( 500 ).json( { message: 'Database error' } );
        if ( !user ) return res.status( 400 ).json( { message: 'User not found' } );
        const match = await bcrypt.compare( password, user.password );
        if ( !match ) return res.status( 400 ).json( { message: 'Invalid password' } );
        const token = jwt.sign( { id: user.id, email: user.email }, 'secret_key', { expiresIn: '1h' } );
        res.json( { token } );
    } );
} );

app.get( '/user', ( req, res ) =>
{
    const token = req.headers[ 'authorization' ]?.split( ' ' )[ 1 ];
    if ( !token ) return res.status( 401 ).json( { message: 'No token provided' } );
    jwt.verify( token, 'secret_key', ( err, decoded ) =>
    {
        if ( err ) return res.status( 401 ).json( { message: 'Invalid token' } );
        db.get( 'SELECT id, username, email FROM users WHERE id = ?', [ decoded.id ], ( err, user ) =>
        {
            if ( err ) return res.status( 500 ).json( { message: 'Database error' } );
            if ( !user ) return res.status( 404 ).json( { message: 'User not found' } );
            res.json( user );
        } );
    } );
} );

app.post( '/contact', ( req, res ) =>
{
    const { name, email, message } = req.body;
    console.log( 'Received contact request:', { name, email, message } );
    if ( !name || !email || !message )
    {
        return res.status( 400 ).json( { message: 'All fields are required' } );
    }
    if ( !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test( email ) )
    {
        return res.status( 400 ).json( { message: 'Invalid email format' } );
    }
    db.run( 'INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)',
        [ name, email, message ], ( err ) =>
        {
            if ( err )
            {
                console.error( 'Database insert error:', err );
                return res.status( 500 ).json( { message: 'Error saving message' } );
            }
            res.status( 201 ).json( { message: 'Message received successfully' } );
        } );
} );

// New chatbot endpoint
app.post( '/chat', ( req, res ) =>
{
    const { message } = req.body;
    if ( !message )
    {
        return res.status( 400 ).json( { message: 'No message provided' } );
    }
    const response = getChatResponse( message );
    res.json( { response } );
} );

app.listen( 3000, () =>
{
    console.log( 'Server running on http://localhost:3000' );
} );