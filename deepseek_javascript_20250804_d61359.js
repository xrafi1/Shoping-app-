// DOM Elements
const productsContainer = document.getElementById('products-container');
const productModal = document.getElementById('product-modal');
const cartModal = document.getElementById('cart-modal');
const authModal = document.getElementById('auth-modal');
const authLink = document.getElementById('auth-link');
const cartLink = document.getElementById('cart-link');
const cartCount = document.getElementById('cart-count');
const closeButtons = document.querySelectorAll('.close');

// Current user and cart
let currentUser = null;
let cart = [];

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Load products
    loadProducts();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check auth state
    checkAuthState();
    
    // Update time
    updateTime();
    setInterval(updateTime, 60000);
});

function setupEventListeners() {
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.dataset.section;
            loadProducts(section);
        });
    });
    
    // Category links
    document.querySelectorAll('[data-category]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = e.target.dataset.category;
            loadProducts('category', category);
        });
    });
    
    // Auth link
    authLink.addEventListener('click', (e) => {
        e.preventDefault();
        authModal.style.display = 'block';
    });
    
    // Cart link
    cartLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentUser) {
            loadCart();
            cartModal.style.display = 'block';
        } else {
            authModal.style.display = 'block';
        }
    });
    
    // Close modals
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            productModal.style.display = 'none';
            cartModal.style.display = 'none';
            authModal.style.display = 'none';
        });
    });
    
    // Auth tabs
    document.getElementById('login-tab').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
        e.target.classList.add('active');
        document.getElementById('register-tab').classList.remove('active');
    });
    
    document.getElementById('register-tab').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-form').style.display = 'block';
        document.getElementById('login-form').style.display = 'none';
        e.target.classList.add('active');
        document.getElementById('login-tab').classList.remove('active');
    });
    
    // Auth forms
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
}

// Firebase functions
function checkAuthState() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            authLink.textContent = 'Logout';
            authLink.href = '#';
            authLink.removeEventListener('click', showAuthModal);
            authLink.addEventListener('click', handleLogout);
            loadCart();
        } else {
            currentUser = null;
            authLink.textContent = 'Login';
            authLink.href = '#';
            authLink.addEventListener('click', showAuthModal);
            authLink.removeEventListener('click', handleLogout);
            cartCount.textContent = '0';
        }
    });
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            authModal.style.display = 'none';
        })
        .catch(error => {
            alert(error.message);
        });
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Add user to Firestore
            return db.collection('users').doc(userCredential.user.uid).set({
                name: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            authModal.style.display = 'none';
        })
        .catch(error => {
            alert(error.message);
        });
}

function handleLogout(e) {
    e.preventDefault();
    auth.signOut()
        .then(() => {
            cart = [];
            cartCount.textContent = '0';
        })
        .catch(error => {
            alert(error.message);
        });
}

// Product functions
function loadProducts(filter = 'popular', value = null) {
    let productsQuery = db.collection('products').where('status', '==', 'active');
    
    if (filter === 'popular') {
        productsQuery = productsQuery.orderBy('sold', 'desc').limit(8);
    } else if (filter === 'recent') {
        productsQuery = productsQuery.orderBy('createdAt', 'desc').limit(8);
    } else if (filter === 'category') {
        productsQuery = productsQuery.where('category', '==', value);
    }
    
    productsQuery.get()
        .then(querySnapshot => {
            productsContainer.innerHTML = '';
            querySnapshot.forEach(doc => {
                const product = doc.data();
                displayProduct(product, doc.id);
            });
        })
        .catch(error => {
            console.error("Error loading products: ", error);
        });
}

function displayProduct(product, id) {
    const productElement = document.createElement('div');
    productElement.className = 'product-card';
    productElement.innerHTML = `
        <img src="${product.imageUrl}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p class="price">$${product.price}</p>
        <button class="view-details" data-id="${id}">View Details</button>
    `;
    
    productsContainer.appendChild(productElement);
    
    // Add event listener to the view details button
    productElement.querySelector('.view-details').addEventListener('click', () => {
        showProductDetails(product, id);
    });
}

function showProductDetails(product, id) {
    document.getElementById('modal-title').textContent = product.name;
    document.getElementById('modal-description').textContent = product.description;
    document.getElementById('modal-price').textContent = product.price;
    document.getElementById('modal-image').src = product.imageUrl;
    
    // Store product ID in the modal for later use
    productModal.dataset.productId = id;
    
    // Set up add to cart button
    document.getElementById('add-to-cart').onclick = () => {
        addToCart(id, product);
    };
    
    // Set up buy now button
    document.getElementById('buy-now').onclick = () => {
        addToCart(id, product, true);
    };
    
    productModal.style.display = 'block';
}

// Cart functions
function addToCart(productId, product, checkout = false) {
    if (!currentUser) {
        authModal.style.display = 'block';
        return;
    }
    
    const size = document.getElementById('size-select').value;
    const cartItem = {
        productId: productId,
        name: product.name,
        price: product.price,
        size: size,
        imageUrl: product.imageUrl,
        quantity: 1
    };
    
    // Check if item already in cart
    const existingItem = cart.find(item => item.productId === productId && item.size === size);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push(cartItem);
    }
    
    updateCart();
    productModal.style.display = 'none';
    
    if (checkout) {
        cartModal.style.display = 'block';
    }
}

function loadCart() {
    if (!currentUser) return;
    
    db.collection('carts').doc(currentUser.uid).get()
        .then(doc => {
            if (doc.exists) {
                cart = doc.data().items || [];
                updateCart();
            }
        })
        .catch(error => {
            console.error("Error loading cart: ", error);
        });
}

function updateCart() {
    // Update UI
    cartCount.textContent = cart.reduce((total, item) => total + item.quantity, 0);
    
    // Update cart items display
    const cartItemsContainer = document.getElementById('cart-items');
    if (cartItemsContainer) {
        cartItemsContainer.innerHTML = '';
        
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Your cart is empty</p>';
            document.getElementById('cart-total').textContent = '0.00';
            return;
        }
        
        let total = 0;
        
        cart.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <img src="${item.imageUrl}" alt="${item.name}">
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <p>Size: ${item.size}</p>
                    <p>$${item.price} x ${item.quantity}</p>
                </div>
                <div class="item-actions">
                    <button class="remove-item" data-index="${index}"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            cartItemsContainer.appendChild(itemElement);
            total += item.price * item.quantity;
            
            // Add event listener to remove button
            itemElement.querySelector('.remove-item').addEventListener('click', () => {
                removeFromCart(index);
            });
        });
        
        document.getElementById('cart-total').textContent = total.toFixed(2);
    }
    
    // Save to Firestore if user is logged in
    if (currentUser) {
        db.collection('carts').doc(currentUser.uid).set({
            items: cart,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .catch(error => {
            console.error("Error updating cart: ", error);
        });
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

// Checkout function
document.getElementById('checkout-btn')?.addEventListener('click', () => {
    if (cart.length === 0) return;
    
    const order = {
        userId: currentUser.uid,
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    db.collection('orders').add(order)
        .then(() => {
            // Update product sold counts
            const batch = db.batch();
            
            cart.forEach(item => {
                const productRef = db.collection('products').doc(item.productId);
                batch.update(productRef, {
                    sold: firebase.firestore.FieldValue.increment(item.quantity)
                });
            });
            
            return batch.commit();
        })
        .then(() => {
            // Clear cart
            cart = [];
            updateCart();
            cartModal.style.display = 'none';
            alert('Order placed successfully!');
        })
        .catch(error => {
            console.error("Error during checkout: ", error);
            alert('There was an error processing your order. Please try again.');
        });
});

// Utility functions
function updateTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    document.getElementById('current-time').textContent = `${hours}:${minutes} ${ampm}`;
}

function showAuthModal(e) {
    e.preventDefault();
    authModal.style.display = 'block';
}