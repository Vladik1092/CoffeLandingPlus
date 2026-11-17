/* ===== Бургер-меню ===== */
const burger = document.querySelector('.burger');
const links = document.querySelector('.links');

if (burger && links) {
    burger.addEventListener('click', () => {
        burger.classList.toggle('active');
        links.classList.toggle('open');
    });

    links.querySelectorAll('a').forEach(a =>
        a.addEventListener('click', () => {
            burger.classList.remove('active');
            links.classList.remove('open');
        })
    );
}

/* ===== Canvas: оптимизированный мягкий дым ===== */
const canvas = document.getElementById('smoke-canvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let W, H, dpr;
    const particles = [];

    const isMobile = window.innerWidth < 768;
    const PARTICLE_COUNT = isMobile ? 40 : 80; 
    const TARGET_FPS = isMobile ? 30 : 60;
    const FRAME_TIME = 1000 / TARGET_FPS;
    let lastTime = 0;

    const smokeSprite = document.createElement('canvas');
    const spriteCtx = smokeSprite.getContext('2d');
    const SPRITE_SIZE = 200;
    smokeSprite.width = SPRITE_SIZE;
    smokeSprite.height = SPRITE_SIZE;

    function createSmokeSprite() {
        const r = SPRITE_SIZE / 2;
        const grad = spriteCtx.createRadialGradient(r, r, 0, r, r, r);
        grad.addColorStop(0, 'rgba(130, 125, 120, 0.35)');   
        grad.addColorStop(0.5, 'rgba(160, 155, 150, 0.15)'); 
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');      
        spriteCtx.fillStyle = grad;
        spriteCtx.beginPath();
        spriteCtx.arc(r, r, r, 0, Math.PI * 2);
        spriteCtx.fill();
    }
    createSmokeSprite();

    function resize() {
        dpr = window.devicePixelRatio || 1;
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const sources = [0.15, 0.4, 0.65, 0.85]; 

    function createParticle(randomY = false) {
        const radius = (isMobile ? 50 : 80) + Math.random() * (isMobile ? 50 : 80);
        const sourceX = sources[Math.floor(Math.random() * sources.length)] * W;
        const spread = W * 0.15;

        return {
            x: sourceX + (Math.random() - 0.5) * spread,
            y: randomY ? Math.random() * H : H + radius,
            radius,
            vy: 0.4 + Math.random() * 0.6,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.005 + Math.random() * 0.01,
            wobbleAmp: 1.0 + Math.random() * 1.5,
            growth: 0.2 + Math.random() * 0.3,
            alpha: 0.3 + Math.random() * 0.4,
            life: 0,
            maxLife: 500 + Math.random() * 500
        };
    }

    function initParticles() {
        particles.length = 0;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(createParticle(true));
        }
    }

    function draw(currentTime) {
        if (currentTime - lastTime < FRAME_TIME) {
            requestAnimationFrame(draw);
            return;
        }
        lastTime = currentTime;

        ctx.clearRect(0, 0, W, H);

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            p.wobble += p.wobbleSpeed;
            p.x += Math.sin(p.wobble) * p.wobbleAmp;
            p.y -= p.vy;
            p.radius += p.growth;
            p.life++;

            let currentAlpha = p.alpha;
            if (p.life < 60) currentAlpha *= (p.life / 60);
            if (p.y < H * 0.4) currentAlpha *= (p.y / (H * 0.4)); 

            ctx.globalAlpha = Math.max(0, currentAlpha);
            
            const size = p.radius * 2;
            ctx.drawImage(smokeSprite, p.x - p.radius, p.y - p.radius, size, size);

            if (p.y < -p.radius || p.life > p.maxLife) {
                particles[i] = createParticle(false);
            }
        }

        ctx.globalAlpha = 1;
        requestAnimationFrame(draw);
    }

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resize();
            initParticles();
        }, 200);
    });

    resize();
    initParticles();
    requestAnimationFrame(draw);
}

/* ===== ЛОГИКА КОРЗИНЫ И ДОСТАВКИ ===== */
let cart = JSON.parse(localStorage.getItem('coffeeCart')) || [];

const COFFEE_LAT = 53.120302;
const COFFEE_LON = 50.083886;

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function updateCartUI() {
    const cartCountEl = document.querySelector('.cart-count');
    const cartItemsEl = document.getElementById('cart-items');
    const cartTotalEl = document.getElementById('cart-total');
    const deliveryOptionsEl = document.getElementById('delivery-options');
    
    if (cartCountEl) {
        cartCountEl.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    }
    
    if (cartItemsEl && cartTotalEl) {
        cartItemsEl.innerHTML = '';
        let total = 0;
        
        if (cart.length === 0) {
            cartItemsEl.innerHTML = '<p style="text-align:center; color:var(--text-muted);">Корзина пуста</p>';
            if (deliveryOptionsEl) deliveryOptionsEl.style.display = 'none';
        } else {
            if (deliveryOptionsEl) deliveryOptionsEl.style.display = 'block';
            cart.forEach((item, index) => {
                total += item.price * item.quantity;
                cartItemsEl.innerHTML += `
                    <div class="cart-item">
                        <div>
                            <p class="cart-item-title">${item.title} <span style="font-weight:normal; font-size:0.9rem;">x${item.quantity}</span></p>
                        </div>
                        <div>
                            <span class="cart-item-price">${item.price * item.quantity} ₽</span>
                            <button onclick="removeFromCart(${index})" style="background:none; border:none; cursor:pointer; color:red; margin-left:10px;">✕</button>
                        </div>
                    </div>
                `;
            });
        }
        cartTotalEl.textContent = total;
    }
}

function addToCart(title, price) {
    const existingItem = cart.find(item => item.title === title);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ title, price, quantity: 1 });
    }
    localStorage.setItem('coffeeCart', JSON.stringify(cart));
    updateCartUI();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('coffeeCart', JSON.stringify(cart));
    updateCartUI();
}

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    if (modal) modal.classList.toggle('active');
}

function checkout() {
    if (cart.length === 0) return alert('Корзина пуста');
    
    const deliveryTypeElement = document.querySelector('input[name="delivery"]:checked');
    const deliveryType = deliveryTypeElement ? deliveryTypeElement.value : 'pickup';
    const addressInput = document.getElementById('delivery-address');
    const address = addressInput ? addressInput.value.trim() : '';
    
    if (deliveryType === 'delivery' && !address) {
        return alert('Пожалуйста, укажите адрес доставки (или выберите точку на карте)');
    }

    let itemsTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    let deliveryCost = 0;
    if (deliveryType === 'delivery') {
        const savedDistance = parseFloat(localStorage.getItem('deliveryDistance')) || 3; 
        deliveryCost = Math.round(savedDistance * 500); 
        deliveryCost = Math.ceil(deliveryCost / 10) * 10;
    }

    const grandTotal = itemsTotal + deliveryCost;

    const orderData = {
        items: cart,
        itemsTotal: itemsTotal,
        deliveryType: deliveryType,
        address: address,
        deliveryCost: deliveryCost,
        grandTotal: grandTotal
    };
    
    localStorage.setItem('coffeeOrder', JSON.stringify(orderData));
    localStorage.removeItem('deliveryDistance');
    
    cart = [];
    localStorage.setItem('coffeeCart', JSON.stringify(cart));
    updateCartUI();
    
    window.location.href = 'success.html';
}

document.addEventListener('change', function(e) {
    if (e.target.name === 'delivery') {
        const mapWrapper = document.getElementById('map-wrapper');
        if (mapWrapper) {
            mapWrapper.style.display = e.target.value === 'delivery' ? 'block' : 'none';
        }
        const addressInput = document.getElementById('delivery-address');
        if (addressInput && e.target.value === 'pickup') {
            addressInput.value = '';
            localStorage.removeItem('deliveryDistance');
            updateDeliveryPriceInfo(0);
        }
    }
});

function initDeliveryMap() {
    const addressInput = document.getElementById('delivery-address');
    
    
    if (addressInput) {
        addressInput.addEventListener('input', function() {
            const address = this.value.trim();
            const infoEl = document.getElementById('delivery-info');
            
            if (address.length > 3) {
                // Симуляция: если введено больше 3 букв, считаем расстояние случайно от 1 до 7 км
                const simulatedDistance = (Math.random() * 6 + 1).toFixed(1);
                localStorage.setItem('deliveryDistance', simulatedDistance);
                
                const cost = Math.ceil((simulatedDistance * 500) / 10) * 10;
                if (infoEl) {
                    infoEl.innerHTML = `<strong>Расстояние:</strong> ~${simulatedDistance} км <br> <strong>Стоимость доставки:</strong> ${cost} ₽`;
                }
            } else {
                localStorage.removeItem('deliveryDistance');
                if (infoEl) {
                    infoEl.innerHTML = 'Введите адрес для расчета стоимости доставки';
                }
            }
        });
    }
}

function updateDeliveryPriceInfo(distKm) {
    const infoEl = document.getElementById('delivery-info');
    
    if (infoEl) {
        const cost = Math.ceil((distKm * 500) / 10) * 10;
        infoEl.innerHTML = `<strong>Расстояние:</strong> ${distKm.toFixed(1)} км <br> <strong>Стоимость доставки:</strong> ${cost} ₽`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    initDeliveryMap();
});