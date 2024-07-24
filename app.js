const produtos = [
    { nome: "Hamburguer Clássico", preco: 20.00, descricao: "Delicioso hambúrguer com carne 100% bovina", imagem: "cheeseburguer.jpeg" },
    { nome: "Cheeseburguer", preco: 22.00, descricao: "Hambúrguer com queijo derretido e bacon", imagem: "cheeseburguer.jpeg" },
    { nome: "Veggie Burger", preco: 18.00, descricao: "Hambúrguer vegetariano com legumes frescos", imagem: "cheeseburguer.jpeg" }
];

const taxaEntrega = 2.00;
let totalPedido = 0;
const produtosPedido = [];

function atualizarTotal() {
    const incluirTaxa = document.getElementById('incluirTaxa').checked;
    const totalFinal = incluirTaxa ? totalPedido + taxaEntrega : totalPedido;
    document.getElementById('totalPedido').textContent = `Total do Pedido: R$ ${totalFinal.toFixed(2)}`;
}

function adicionarProduto(nome, preco) {
    produtosPedido.push({ nome, preco });
    totalPedido += preco;
    atualizarTotal();
}

function criarCardProduto(produto) {
    const card = document.createElement('div');
    card.className = 'card';

    const img = document.createElement('img');
    img.src = produto.imagem;
    img.alt = produto.nome;
    card.appendChild(img);

    const h3 = document.createElement('h3');
    h3.textContent = produto.nome;
    card.appendChild(h3);

    const pDescricao = document.createElement('p');
    pDescricao.textContent = produto.descricao;
    card.appendChild(pDescricao);

    const pPreco = document.createElement('p');
    pPreco.textContent = `R$ ${produto.preco.toFixed(2)}`;
    card.appendChild(pPreco);

    const button = document.createElement('button');
    button.textContent = 'Adicionar ao Pedido';
    button.addEventListener('click', () => adicionarProduto(produto.nome, produto.preco));
    card.appendChild(button);

    return card;
}

function carregarProdutos() {
    const produtosContainer = document.getElementById('produtos');
    produtos.forEach(produto => {
        const card = criarCardProduto(produto);
        produtosContainer.appendChild(card);
    });
}

function mostrarModal() {
    document.getElementById('confirmationModal').style.display = 'flex';
}

function esconderModal() {
    document.getElementById('confirmationModal').style.display = 'none';
}

function obterNumeroPedido() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('PedidosDB', 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const objectStore = db.createObjectStore('pedidos', { keyPath: 'id', autoIncrement: true });
            objectStore.createIndex('numero', 'numero', { unique: true });
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['pedidos'], 'readonly');
            const objectStore = transaction.objectStore('pedidos');
            const index = objectStore.index('numero');
            const request = index.getAll();

            request.onsuccess = () => {
                const pedidos = request.result;
                const numero = pedidos.length > 0 ? pedidos[pedidos.length - 1].numero + 1 : 1;
                resolve(numero);
            };

            request.onerror = () => {
                reject('Erro ao obter número do pedido.');
            };
        };

        request.onerror = () => {
            reject('Erro ao abrir o banco de dados.');
        };
    });
}

function salvarPedido(numero, nomeCliente, enderecoCliente, telefoneCliente, metodoPagamento, incluirTaxa) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('PedidosDB', 1);

        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['pedidos'], 'readwrite');
            const objectStore = transaction.objectStore('pedidos');

            const pedido = {
                numero,
                nomeCliente,
                enderecoCliente,
                telefoneCliente,
                metodoPagamento,
                produtos: produtosPedido,
                total: totalPedido,
                taxaEntrega: incluirTaxa ? taxaEntrega : 0,
                totalFinal: incluirTaxa ? totalPedido + taxaEntrega : totalPedido
            };

            const requestAdd = objectStore.add(pedido);

            requestAdd.onsuccess = () => {
                resolve(pedido);
            };

            requestAdd.onerror = () => {
                reject('Erro ao salvar pedido.');
            };
        };

        request.onerror = () => {
            reject('Erro ao abrir o banco de dados.');
        };
    });
}

document.getElementById('gerarPedido').addEventListener('click', mostrarModal);

document.getElementById('confirmarPedido').addEventListener('click', async function() {
    esconderModal();

    const nomeCliente = document.getElementById('nomeCliente').value;
    const enderecoCliente = document.getElementById('enderecoCliente').value;
    const telefoneCliente = document.getElementById('telefoneCliente').value;
    const metodoPagamento = document.querySelector('input[name="pagamento"]:checked').value;
    const incluirTaxa = document.getElementById('incluirTaxa').checked;

    if (!nomeCliente || !enderecoCliente || !telefoneCliente) {
        alert('Por favor, preencha todos os campos.');
        return;
    }

    const numeroPedido = await obterNumeroPedido();

    try {
        const pedido = await salvarPedido(numeroPedido, nomeCliente, enderecoCliente, telefoneCliente, metodoPagamento, incluirTaxa);

        const enderecoMaps = encodeURIComponent(enderecoCliente);
        const linkMaps = `https://www.google.com/maps/search/?api=1&query=${enderecoMaps}`;

        const mensagemHamburgueria = `Novo pedido #${pedido.numero} de ${nomeCliente}:\n\n${produtosPedido.map(p => `${p.nome} - R$ ${p.preco.toFixed(2)}`).join('\n')}\n\nTotal: R$ ${pedido.totalFinal.toFixed(2)}\n\nMétodo de Pagamento: ${metodoPagamento}\n\nLocalização: ${linkMaps}`;
        const mensagemCliente = `Seu pedido #${pedido.numero} foi recebido! O total do pedido é R$ ${pedido.totalFinal.toFixed(2)} (incluindo R$ ${pedido.taxaEntrega.toFixed(2)} de taxa de entrega).\nMétodo de Pagamento: ${metodoPagamento}\nAcompanhe o status do pedido e veja a localização da entrega.`;

        const numeroWhatsAppHamburgueria = "5584991612793";
        const urlWhatsAppHamburgueria = `https://api.whatsapp.com/send?phone=${numeroWhatsAppHamburgueria}&text=${encodeURIComponent(mensagemHamburgueria)}`;

        window.open(urlWhatsAppHamburgueria, '_blank');
        alert(mensagemCliente);

        // Limpar o pedido atual
        totalPedido = 0;
        produtosPedido.length = 0;
        atualizarTotal();
    } catch (error) {
        alert(error);
    }
});

document.getElementById('cancelarPedido').addEventListener('click', esconderModal);

carregarProdutos();



// Obtém o elemento da propaganda e o botão de fechar
const popup = document.getElementById('popup');
const close = document.getElementById('close');

// Adiciona um ouvinte de eventos para o botão de fechar
close.addEventListener('click', () => {
    popup.style.display = 'none';
});