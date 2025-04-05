// Initialize cart and order history from localStorage
let cart = JSON.parse( localStorage.getItem( 'cart' ) ) || [];
let orderHistory = JSON.parse( localStorage.getItem( 'orderHistory' ) ) || [];

// Update UI on page load
document.addEventListener( 'DOMContentLoaded', () =>
{
    updateCartUI();
    updateOrderHistory();
    updateAuthUI();
    protectDashboard();
    displayUserData();
} );

// Cart Management
function addToCart ( name, price )
{
    const item = cart.find( i => i.name === name );
    if ( item )
    {
        item.quantity++;
    } else
    {
        cart.push( { name, price: parseInt( price ), quantity: 1 } );
    }
    updateCartUI();
    localStorage.setItem( 'cart', JSON.stringify( cart ) );
    showConfirmationModal( `${ name } has been added to your cart!` );
}

function updateCartUI ()
{
    const cartCountElement = document.getElementById( 'cart-count' );
    if ( cartCountElement )
    {
        const cartCount = cart.reduce( ( sum, item ) => sum + item.quantity, 0 );
        cartCountElement.textContent = cartCount || '0';
    }
    const cartItems = document.getElementById( 'cart-items' );
    if ( cartItems )
    {
        cartItems.innerHTML = '';
        cart.forEach( item =>
        {
            const div = document.createElement( 'div' );
            div.textContent = `${ item.name } - ₹${ item.price } x ${ item.quantity }`;
            const removeBtn = document.createElement( 'button' );
            removeBtn.textContent = 'Remove';
            removeBtn.onclick = () => removeFromCart( item.name );
            div.appendChild( removeBtn );
            cartItems.appendChild( div );
        } );
        const total = cart.reduce( ( sum, item ) => sum + item.price * item.quantity, 0 );
        document.getElementById( 'cart-total' ).textContent = total || '0';
    }
}

function removeFromCart ( name )
{
    cart = cart.filter( item => item.name !== name );
    updateCartUI();
    localStorage.setItem( 'cart', JSON.stringify( cart ) );
}

function updateOrderHistory ()
{
    const orderList = document.getElementById( 'order-list' );
    if ( orderList )
    {
        orderList.innerHTML = '';
        if ( orderHistory.length === 0 )
        {
            orderList.innerHTML = '<p>No orders yet.</p>';
        } else
        {
            orderHistory.forEach( order =>
            {
                const div = document.createElement( 'div' );
                div.textContent = `Order on ${ order.date }: ${ order.items.map( item => `${ item.name } (x${ item.quantity })` ).join( ', ' ) } - Total: ₹${ order.total }`;
                orderList.appendChild( div );
            } );
        }
    }
}

// Chatbot Functionality
function toggleChatbot ()
{
    const chatbot = document.getElementById( 'chatbot' );
    const toggleBtn = document.querySelector( '.chatbot-toggle' );
    if ( chatbot.style.display === 'flex' )
    {
        chatbot.style.display = 'none';
        toggleBtn.style.display = 'flex';
    } else
    {
        chatbot.style.display = 'flex';
        toggleBtn.style.display = 'none';
    }
}

function sendMessage ()
{
    const input = document.getElementById( 'input' );
    const chatbox = document.getElementById( 'chatbox' );
    const message = input.value.trim();
    if ( message )
    {
        chatbox.innerHTML += `<div class="message user-message"><strong>You:</strong> ${ message }</div>`;
        fetch( '/chat', { // Updated to work with server.js on the same domain
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify( { message: message } )
        } )
            .then( response =>
            {
                if ( !response.ok ) throw new Error( 'Server error' );
                return response.json();
            } )
            .then( data =>
            {
                chatbox.innerHTML += `<div class="message bot-message"><strong>Bot:</strong> ${ data.response }</div>`;
                chatbox.scrollTop = chatbox.scrollHeight;
            } )
            .catch( error =>
            {
                chatbox.innerHTML += `<div class="message bot-message"><strong>Bot:</strong> Sorry, something went wrong!</div>`;
                console.error( 'Chat error:', error );
            } );
        input.value = '';
    }
}

// UI Interactions
const cartToggle = document.getElementById( 'cart-toggle' );
if ( cartToggle )
{
    cartToggle.addEventListener( 'click', () =>
    {
        document.getElementById( 'cart-sidebar' ).classList.toggle( 'open' );
    } );
}

const closeCart = document.getElementById( 'close-cart' );
if ( closeCart )
{
    closeCart.addEventListener( 'click', () =>
    {
        document.getElementById( 'cart-sidebar' ).classList.remove( 'open' );
    } );
}

document.querySelectorAll( '.add-to-cart' ).forEach( button =>
{
    button.addEventListener( 'click', () =>
    {
        if ( !localStorage.getItem( 'token' ) )
        {
            alert( 'Please login to add items to cart!' );
            window.location.href = 'login.html';
            return;
        }
        const name = button.getAttribute( 'data-name' );
        const price = button.getAttribute( 'data-price' );
        addToCart( name, price );
    } );
} );

function showConfirmationModal ( message )
{
    const confirmationModal = document.getElementById( 'cart-confirmation' );
    const confirmationMessage = document.getElementById( 'confirmation-message' );
    if ( confirmationModal && confirmationMessage )
    {
        confirmationMessage.textContent = message;
        confirmationModal.style.display = 'block';
    }
}

const closeConfirmation = document.getElementById( 'close-confirmation' );
if ( closeConfirmation )
{
    closeConfirmation.addEventListener( 'click', () =>
    {
        document.getElementById( 'cart-confirmation' ).style.display = 'none';
    } );
}

const searchBar = document.getElementById( 'search-bar' );
if ( searchBar )
{
    searchBar.addEventListener( 'input', ( e ) =>
    {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll( '.product' ).forEach( product =>
        {
            const name = product.querySelector( 'h3' ).textContent.toLowerCase();
            product.style.display = name.includes( query ) ? 'block' : 'none';
        } );
    } );
}

function applyFilters ()
{
    const colorFilter = document.getElementById( 'color-filter' )?.value || 'all';
    const priceFilter = document.getElementById( 'price-filter' )?.value || 'all';
    document.querySelectorAll( '.product' ).forEach( product =>
    {
        const color = product.getAttribute( 'data-color' );
        const price = parseInt( product.getAttribute( 'data-price' ) || '0' );
        let show = true;
        if ( colorFilter !== 'all' && color !== colorFilter ) show = false;
        if ( priceFilter !== 'all' )
        {
            if ( priceFilter === '0-150' && ( price < 0 || price > 150 ) ) show = false;
            if ( priceFilter === '150-200' && ( price < 150 || price > 200 ) ) show = false;
            if ( priceFilter === '200+' && price <= 200 ) show = false;
        }
        product.style.display = show ? 'block' : 'none';
    } );
}
const colorFilter = document.getElementById( 'color-filter' );
const priceFilter = document.getElementById( 'price-filter' );
if ( colorFilter ) colorFilter.addEventListener( 'change', applyFilters );
if ( priceFilter ) priceFilter.addEventListener( 'change', applyFilters );

const checkoutBtn = document.getElementById( 'checkout-btn' );
if ( checkoutBtn )
{
    checkoutBtn.addEventListener( 'click', () =>
    {
        if ( !localStorage.getItem( 'token' ) )
        {
            alert( 'Please login to checkout!' );
            window.location.href = 'login.html';
            return;
        }
        document.getElementById( 'checkout-modal' ).style.display = 'block';
    } );
}

const closeModal = document.getElementById( 'close-modal' );
if ( closeModal )
{
    closeModal.addEventListener( 'click', () =>
    {
        document.getElementById( 'checkout-modal' ).style.display = 'none';
    } );
}

const checkoutForm = document.getElementById( 'checkout-form' );
if ( checkoutForm )
{
    checkoutForm.addEventListener( 'submit', ( e ) =>
    {
        e.preventDefault();
        if ( !localStorage.getItem( 'token' ) )
        {
            alert( 'Please login to checkout!' );
            window.location.href = 'login.html';
            return;
        }
        const total = cart.reduce( ( sum, item ) => sum + item.price * item.quantity, 0 );
        orderHistory.push( {
            date: new Date().toLocaleString(),
            items: [ ...cart ],
            total: total
        } );
        localStorage.setItem( 'orderHistory', JSON.stringify( orderHistory ) );
        alert( 'Order placed successfully!' );
        cart = [];
        updateCartUI();
        updateOrderHistory();
        localStorage.setItem( 'cart', JSON.stringify( cart ) );
        document.getElementById( 'checkout-modal' ).style.display = 'none';
        document.getElementById( 'cart-sidebar' ).classList.remove( 'open' );
    } );
}

// Authentication and Contact
const signupForm = document.getElementById( 'signup-form' );
if ( signupForm )
{
    signupForm.addEventListener( 'submit', async ( e ) =>
    {
        e.preventDefault();
        const username = document.getElementById( 'username' ).value;
        const email = document.getElementById( 'email' ).value;
        const password = document.getElementById( 'password' ).value;
        try
        {
            const response = await fetch( '/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify( { username, email, password } )
            } );
            const result = await response.json();
            if ( response.ok )
            {
                alert( 'Sign up successful! Please login.' );
                window.location.href = 'login.html';
            } else
            {
                alert( result.message );
            }
        } catch ( error )
        {
            alert( 'Error during sign-up. Please try again.' );
            console.error( error );
        }
    } );
}

const loginForm = document.getElementById( 'login-form' );
if ( loginForm )
{
    loginForm.addEventListener( 'submit', async ( e ) =>
    {
        e.preventDefault();
        const email = document.getElementById( 'login-email' ).value;
        const password = document.getElementById( 'login-password' ).value;
        try
        {
            const response = await fetch( '/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify( { email, password } )
            } );
            const result = await response.json();
            if ( response.ok )
            {
                localStorage.setItem( 'token', result.token );
                alert( 'Login successful!' );
                window.location.href = 'dashboard.html';
            } else
            {
                alert( result.message );
            }
        } catch ( error )
        {
            alert( 'Error during login. Please try again.' );
            console.error( error );
        }
    } );
}

const contactForm = document.getElementById( 'contact-form' );
if ( contactForm )
{
    contactForm.addEventListener( 'submit', async ( e ) =>
    {
        e.preventDefault();
        const name = document.getElementById( 'name' ).value;
        const email = document.getElementById( 'email' ).value;
        const message = document.getElementById( 'message' ).value;
        try
        {
            const response = await fetch( '/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify( { name, email, message } )
            } );
            const result = await response.json();
            if ( response.ok )
            {
                alert( 'Thank you! Your message has been sent successfully.' );
                contactForm.reset();
            } else
            {
                alert( result.message );
            }
        } catch ( error )
        {
            alert( 'Error sending message. Please try again later.' );
            console.error( 'Contact form submission error:', error );
        }
    } );
}

function protectDashboard ()
{
    if ( window.location.pathname.includes( 'dashboard.html' ) && !localStorage.getItem( 'token' ) )
    {
        alert( 'Please login to access the dashboard!' );
        window.location.href = 'login.html';
    }
}

async function displayUserData ()
{
    const userEmailElement = document.getElementById( 'user-email' );
    if ( userEmailElement && localStorage.getItem( 'token' ) )
    {
        try
        {
            const response = await fetch( '/user', {
                headers: { 'Authorization': `Bearer ${ localStorage.getItem( 'token' ) }` }
            } );
            const user = await response.json();
            if ( response.ok )
            {
                userEmailElement.textContent = user.email;
            } else
            {
                console.error( 'Failed to fetch user data:', user.message );
            }
        } catch ( error )
        {
            console.error( 'Error fetching user data:', error );
        }
    }
}

function updateAuthUI ()
{
    const signupLink = document.getElementById( 'signup-link' );
    const loginLink = document.getElementById( 'login-link' );
    const profileLink = document.getElementById( 'profile-link' );
    const logoutLink = document.getElementById( 'logout-link' );
    if ( localStorage.getItem( 'token' ) )
    {
        if ( signupLink ) signupLink.style.display = 'none';
        if ( loginLink ) loginLink.style.display = 'none';
        if ( profileLink ) profileLink.style.display = 'inline';
        if ( logoutLink ) logoutLink.style.display = 'inline';
    } else
    {
        if ( signupLink ) signupLink.style.display = 'inline';
        if ( loginLink ) loginLink.style.display = 'inline';
        if ( profileLink ) profileLink.style.display = 'none';
        if ( logoutLink ) logoutLink.style.display = 'none';
    }
}

const logoutLink = document.getElementById( 'logout-link' );
if ( logoutLink )
{
    logoutLink.addEventListener( 'click', ( e ) =>
    {
        e.preventDefault();
        localStorage.removeItem( 'token' );
        alert( 'Logged out successfully!' );
        updateAuthUI();
        window.location.href = 'index.html';
    } );
}

const goToShopBtn = document.getElementById( 'go-to-shop' );
if ( goToShopBtn )
{
    goToShopBtn.addEventListener( 'click', () =>
    {
        window.location.href = 'index.html';
    } );
}