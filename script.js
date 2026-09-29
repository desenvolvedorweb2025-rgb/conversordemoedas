const currencies = {
	BRL: { name: 'Real brasileiro', symbol: 'R$', image: 'assets/brasil 2-3.png', alt: 'Bandeira do Brasil' },
	USD: { name: 'Dólar americano', symbol: 'US$', image: 'assets/estados-unidos (1) 1.png', alt: 'Bandeira dos Estados Unidos' },
	EUR: { name: 'Euro', symbol: '€', image: 'assets/e¢.png', alt: 'Símbolo do euro' },
};

const rateCache = new Map();

const parseAmount = (value) => {
	const normalized = value.trim().replace(/[^\d,.-]/g, '');
	if (!normalized) {
		return null;
	}

	const brazilianDecimal = normalized.includes(',');
	const groupedThousands = /^-?\d{1,3}(?:\.\d{3})+$/.test(normalized);
	const parsed = Number(
		brazilianDecimal
			? normalized.replace(/\./g, '').replace(',', '.')
			: groupedThousands
				? normalized.replace(/\./g, '')
				: normalized,
	);

	return Number.isFinite(parsed) ? parsed : null;
};

const formatAmount = (amount, currency) =>
	new Intl.NumberFormat('pt-BR', {
		style: 'currency',
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);

const getRates = async (currency) => {
	if (!rateCache.has(currency)) {
		const response = await fetch(`https://open.er-api.com/v6/latest/${currency}`);
		if (!response.ok) {
			throw new Error('Não foi possível consultar a cotação agora. Tente novamente.');
		}

		const data = await response.json();
		if (data.result !== 'success' || !data.rates) {
			throw new Error('A cotação não está disponível no momento. Tente novamente.');
		}

		rateCache.set(currency, data.rates);
	}

	return rateCache.get(currency);
};

const updateCurrencyDisplay = (select, result, currencyCode) => {
	const currency = currencies[currencyCode];
	const icon = result.querySelector('.currency-icon');

	icon.src = currency.image;
	icon.alt = currency.alt;
	result.querySelector('.currency-name').textContent = currency.name;
	result.querySelector('.currency-value').textContent = formatAmount(0, currencyCode);
	select.dataset.currencyName = currency.name;
};

const initializeConverter = () => {
	const fromSelect = document.querySelector('#currency-from');
	const toSelect = document.querySelector('#currency-to');
	const amountInput = document.querySelector('#amount');
	const convertButton = document.querySelector('.convert-button');
	const swapButton = document.querySelector('#swap-currencies');
	const status = document.querySelector('#conversion-status');
	const originResult = document.querySelector('.currency-result--origin');
	const destinationResult = document.querySelector('.currency-result--destination');

	const updateCurrencyNames = () => {
		updateCurrencyDisplay(fromSelect, originResult, fromSelect.value);
		updateCurrencyDisplay(toSelect, destinationResult, toSelect.value);
		status.textContent = '';
	};

	fromSelect.addEventListener('change', updateCurrencyNames);
	toSelect.addEventListener('change', updateCurrencyNames);

	const convertCurrencies = async () => {
		const amount = parseAmount(amountInput.value);
		const fromCurrency = fromSelect.value;
		const toCurrency = toSelect.value;

		if (amount === null || amount < 0) {
			status.textContent = 'Digite um valor válido, como 10,50.';
			amountInput.focus();
			return;
		}

		status.textContent = '';
		convertButton.disabled = true;

		try {
			let convertedAmount = amount;
			if (fromCurrency !== toCurrency) {
				const rates = await getRates(fromCurrency);
				const rate = rates[toCurrency];
				if (typeof rate !== 'number') {
					throw new Error('Não há cotação disponível para essa combinação de moedas.');
				}
				convertedAmount *= rate;
			}

			originResult.querySelector('.currency-value').textContent = formatAmount(amount, fromCurrency);
			destinationResult.querySelector('.currency-value').textContent = formatAmount(convertedAmount, toCurrency);
		} catch (error) {
			status.textContent = error.message || 'Ocorreu um erro ao converter. Tente novamente.';
		} finally {
			convertButton.disabled = false;
		}
	};

	convertButton.addEventListener('click', convertCurrencies);

	swapButton.addEventListener('click', async () => {
		const currentFrom = fromSelect.value;
		fromSelect.value = toSelect.value;
		toSelect.value = currentFrom;
		updateCurrencyNames();

		if (amountInput.value.trim()) {
			await convertCurrencies();
		}
	});

	amountInput.addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			convertButton.click();
		}
	});

	updateCurrencyNames();
};

initializeConverter();


