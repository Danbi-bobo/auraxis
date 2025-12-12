class CartDrawer extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('keyup', (evt) => {
      if (evt.code === 'Escape') this.close();
    });
    this.querySelector('.drawer__overlay')?.addEventListener('click', () => this.close());
    this.querySelector('.drawer__close-btn')?.addEventListener('click', () => this.close());
  }

  open() {
    this.classList.add('active');
    this.removeAttribute('hidden'); // Xóa attribute hidden của HTML gốc
    document.body.classList.add('cart-drawer-open', 'overflow-hidden');
    
    // Cập nhật lại giỏ hàng mỗi khi mở để đảm bảo data mới nhất
    this.renderContents(); 
  }

  close() {
    this.classList.remove('active');
    document.body.classList.remove('cart-drawer-open', 'overflow-hidden');
    setTimeout(() => {
      // Chỉ thêm hidden sau khi hiệu ứng đóng chạy xong
       if (!this.classList.contains('active')) this.setAttribute('hidden', '');
    }, 300);
  }

  async renderContents() {
    try {
      const res = await fetch('/cart?section_id=cart-drawer');
      const text = await res.text();
      const html = new DOMParser().parseFromString(text, 'text/html');
      
      // Cập nhật nội dung bên trong drawer
      const selectors = ['#CartDrawer', '#CartDrawer-count', '#CartDrawer-items', '.drawer__header', '.drawer__body', '.drawer__footer'];
      
      selectors.forEach(selector => {
        const target = this.querySelector(selector);
        const source = html.querySelector(selector);
        if (target && source) {
          target.innerHTML = source.innerHTML;
        }
      });

      // Gắn lại sự kiện cho các nút cộng trừ/xóa sau khi render lại
      this.initItemListeners();

    } catch (e) {
      console.error('Lỗi update cart:', e);
    }
  }

  initItemListeners() {
    // Xử lý nút xóa
    this.querySelectorAll('.cart-item__remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.updateQuantity(btn.dataset.index, 0);
      });
    });

    // Xử lý input số lượng (nếu có)
    // Code đơn giản hóa cho việc tương thích nhiều theme
  }

  async updateQuantity(line, quantity) {
    const body = JSON.stringify({
      line,
      quantity,
      sections: ['cart-drawer']
    });

    const res = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
    });
    
    this.renderContents();
  }
}

// Định nghĩa Web Component
customElements.define('cart-drawer', CartDrawer);


// ==========================================
// PHẦN QUAN TRỌNG: KẾT NỐI FOXIFY VỚI DRAWER
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  const drawer = document.querySelector('cart-drawer');
  
  // Hàm xử lý khi form Foxify được submit
  function handleFoxifyAddToCart(e) {
    // Tìm form cha của nút bấm
    const form = e.target.closest('form');
    if (!form) return;

    e.preventDefault(); // Chặn hành động mặc định của Foxify (để không reload hoặc hiện popup cũ)
    e.stopPropagation();

    const formData = new FormData(form);
    
    // Thêm hiệu ứng loading cho nút bấm (nếu muốn)
    const btn = form.querySelector('[name="add"]');
    const originalText = btn ? btn.innerText : '';
    if(btn) btn.innerText = 'Adding...';

    // Gọi API của Shopify thủ công
    fetch(window.Shopify.routes.root + 'cart/add.js', {
      method: 'POST',
      body: formData
    })
    .then(response => {
      return response.json();
    })
    .then(data => {
  // 1. Mở Drawer bằng class
  if(drawer) {
      drawer.classList.add('active');
      document.body.classList.add('overflow-hidden');
      // Render lại nội dung cart
      if(drawer.renderContents) {
        drawer.renderContents();
      } else {
        // Fallback: reload cart section
        fetch('/?sections=cart-drawer')
          .then(r => r.json())
          .then(sections => {
            const html = new DOMParser().parseFromString(sections['cart-drawer'], 'text/html');
            const newContent = html.querySelector('.drawer__inner-empty, .drawer__inner');
            if(newContent && drawer.querySelector('.drawer__inner')) {
              drawer.querySelector('.drawer__inner').innerHTML = newContent.innerHTML;
            }
          });
      }
  }
})
    .catch((error) => {
      console.error('Error:', error);
    })
    .finally(() => {
       if(btn) btn.innerText = originalText;
    });
  }

  // Bắt sự kiện click vào nút Add to cart của Foxify
  // Class nút Foxify thường là: .x-product-buy-button hoặc .x-product-form submit
  document.body.addEventListener('click', function(e) {
    // Kiểm tra nếu click vào nút Add to Cart của Foxify
    // Dựa trên code foxify-1765177980A3dGc.liquid: class="x-product-buy-button"
    const btn = e.target.closest('.x-product-buy-button'); 
    
    if (btn && !btn.disabled) {
       handleFoxifyAddToCart(e);
    }
  });
});