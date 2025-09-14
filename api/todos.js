const TODOS = [
  { id: "1", text: "Learn Javascript" },
  { id: "2", text: "Learn ES6" },
  { id: "3", text: "Learn Virtual DOM" },
  { id: "4", text: "Learn React Router" },
  { id: "5", text: "Learn Store with Flux Architecture" },
];

async function fetchTodos() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: true,
        json: async () => {
          return TODOS;
        },
      });
    }, 500);
  });
}

async function fetchTodo(id) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: true,
        json: async () => {
          return TODOS.find((t) => t.id === id);
        },
      });
    }, 500);
  });
}

export { fetchTodos, fetchTodo };
