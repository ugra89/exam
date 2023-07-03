const API_BASE = 'http://localhost:8080';
const userToken = localStorage.getItem('userToken');
const selectedGroup = localStorage.getItem('selectedGroup');

const getBills = async () => {
  try {
    const response = await fetch(`${API_BASE}/bills/${selectedGroup}/bills`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });
    const bills = await response.json();
    return bills;
  } catch (err) {
    console.log(err);
    return [];
  }
};

const renderBills = (bills) => {
  const billsBody = document.getElementById('bills-body');
  billsBody.innerHTML = '';

  const billsTable = document.getElementById('bills-table');
  const billsArray = Object.values(bills);
  billsArray.forEach((bill) => {
    const billRow = document.createElement('tr');
    billRow.innerHTML = `
      <td>${bill.id}</td>
      <td>${bill.description}</td>
      <td>${bill.amount}</td>
    `;
    billsBody.appendChild(billRow);
    billsTable.style.display = 'block';
  });
};

const addBill = async (billData) => {
  try {
    const response = await fetch(`${API_BASE}/bills/${selectedGroup}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify(billData),
    });

    if (response.status === 201) {
      alert('Bill added successfully.');
      const bills = await getBills();
      renderBills(bills);
    } else {
      alert('Failed to add the bill');
    }
  } catch (err) {
    console.log(err);
    alert('An error occurred. Please try again later.');
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const bills = await getBills();
  renderBills(bills);

  const addBillForm = document.getElementById('new-bill-form');
  addBillForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const amount = document.getElementById('amount').value;
    const description = document.getElementById('description').value;

    const billData = {
      amount: parseFloat(amount),
      description,
    };

    addBill(billData);
    addBillForm.reset();
  });
});
