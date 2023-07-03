const API_BASE = 'http://localhost:8080';

const userToken = Cookies.get('token');
console.log(userToken);

if (!userToken) {
  window.location.replace('./login.html');
}

const getGroups = async () => {
  try {
    const response = await fetch(`${API_BASE}/groups`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });

    const groups = await response.json();

    return groups;
  } catch (err) {
    console.log(err);
  }
};

const renderGroups = (groups) => {
  const container = document.getElementById('groups-container');

  groups.forEach((group) => {
    const groupId = group.id;
    const groupName = group.name;

    const existingGroupDiv = document.querySelector(
      `.group[data-group-id="${groupId}"]`
    );

    if (existingGroupDiv) {
      return;
    }

    const groupDiv = document.createElement('div');
    groupDiv.classList.add('group');
    groupDiv.setAttribute('data-group-id', groupId);

    const groupNameHeading = document.createElement('h4');
    groupNameHeading.innerText = groupName;

    const content = document.createElement('button');
    content.classList.add('btn-view-bills');
    content.setAttribute('data-group-id', groupId);
    content.innerText = 'View Bills';

    groupDiv.appendChild(groupNameHeading);
    groupDiv.appendChild(content);

    container.appendChild(groupDiv);
  });
};
const btnAddGroup = document.getElementById('btn-add-group');

btnAddGroup.addEventListener('click', () => {
  const groupIdInput = document.getElementById('group-id');
  const groupId = groupIdInput.value;

  if (groupId) {
    localStorage.setItem('selectedGroup', groupId);
    window.location.href = 'bills.html';
  } else {
    alert('Please enter a valid group ID.');
  }
});

const addGroup = async () => {
  try {
    const response = await fetch(`${API_BASE}/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ name: 'Your Group' }),
    });

    console.log('response', response);

    if (response.ok) {
      alert('New group created successfully!');

      const groups = await getGroups();
      renderGroups(groups);
    } else {
      alert('Failed to create a new group. Please try again.');
    }
  } catch (err) {
    console.log(err);
    alert('An error occurred. Please try again later.');
  }
};
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const groups = await getGroups();

    if (groups && groups.length > 0) {
      renderGroups(groups);

      const btnViewBillsList =
        document.getElementsByClassName('btn-view-bills');

      Array.from(btnViewBillsList).forEach((btn) => {
        btn.addEventListener('click', (event) => {
          const groupId = event.target.getAttribute('data-group-id');
          console.log('Group ID:', groupId);
          localStorage.setItem('selectedGroup', groupId);
          window.location.href = 'bills.html';
        });
      });
    } else {
      console.log('No groups found');
    }
  } catch (err) {
    console.log(err);
    alert('An error occurred. Please try again later.');
  }
});
