const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const testData = {
  userProfile: {
    age: 25,
    gender: 'male',
    experience: 'beginner',
    goals: 'build muscle'
  },
  preferences: {
    duration: '45',
    type: 'full-body',
    equipment: ['dumbbells']
  }
};

fetch('http://localhost:3000/api/generate-plan', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData)
})
.then(response => {
  console.log('Status:', response.status);
  console.log('Headers:', response.headers);
  return response.text();
})
.then(text => {
  console.log('Response body:', text);
})
.catch(error => {
  console.error('Fetch error:', error);
});
