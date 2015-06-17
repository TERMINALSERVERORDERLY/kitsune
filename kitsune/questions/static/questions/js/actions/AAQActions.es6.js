/* globals $:false, _:false */
import AAQDispatcher from '../dispatchers/AAQDispatcher.es6.js';
import {actionTypes} from '../constants/AAQConstants.es6.js';
import QuestionEditStore from '../stores/QuestionEditStore.es6.js';

export function setProduct(product) {
  AAQDispatcher.dispatch({
    type: actionTypes.SET_PRODUCT,
    product,
  });
}

export function setTopic(topic) {
  AAQDispatcher.dispatch({
    type: actionTypes.SET_TOPIC,
    topic,
  });
}

export function setTitle(title) {
  AAQDispatcher.dispatch({
    type: actionTypes.SET_TITLE,
    title,
  });

  searchSuggestions(title);
}

function searchSuggestions(title) {
  $.ajax({
    type: 'GET',
    url: '/api/2/search/suggest',
    data: {
      q: title,
      max_questions: 2,
      max_documents: 2,
      product: QuestionEditStore.getQuestion().product,
    },
  })
  .done((data) => {
    console.log('suggest:', data);
    let docSuggestions = data.documents.map((document) => {
      document.type = 'document';
      return document;
    });
    let questionSuggestions = data.questions.map((question) => {
      question.type = 'question';
      question.url = `/questions/${question.id}`;
      question.summary = '';
      return question;
    });
    let suggestions = docSuggestions.concat(questionSuggestions);
    setSuggestions(suggestions);
  })
  .fail((err) => {
    console.log('suggest error:', err);
  });
}
searchSuggestions = _.throttle(searchSuggestions, 500);

export function setSuggestions(suggestions) {
  AAQDispatcher.dispatch({
    type: actionTypes.SET_SUGGESTIONS,
    suggestions,
  });
}

export function setContent(content) {
  AAQDispatcher.dispatch({
    type: actionTypes.SET_CONTENT,
    content,
  });
}

export function submitQuestion() {
  AAQDispatcher.dispatch({
    type: actionTypes.QUESTION_SUBMIT_OPTIMISTIC,
  });
  let questionData = QuestionEditStore.getQuestion();
  $.ajax({
    url: '/api/2/question/',
    type: 'POST',
    data: questionData,
    beforeSend: function(xhr) {
      let csrf = document.querySelector('input[name=csrfmiddlewaretoken]').value;
      xhr.setRequestHeader('X-CSRFToken', csrf);
    },
  })
  .done((...args) => {
    console.log('done', args);
    AAQDispatcher.dispatch({
      type: actionTypes.QUESTION_SUBMIT_SUCCESS,
    });
  })
  .fail((err) => {
    AAQDispatcher.dispatch({
      type: actionTypes.QUESTION_SUBMIT_FAILURE,
      error: err.statusText,
    });
  });
}

export default {
  setProduct,
  setTopic,
  setTitle,
  setContent,
  submitQuestion,
};
