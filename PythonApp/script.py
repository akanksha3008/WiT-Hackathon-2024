import datetime
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from preprocessing import remove_html_tags
from dueDateFinder import extract_due_date

app = Flask(__name__)
CORS(app, resources={r"/process": {"origins": "https://localhost:3000"}})

import joblib

# Load the model and vectorizer
clf = joblib.load('models/classification_model.pkl')
vectorizer = joblib.load('models/vectorizer.pkl')

dueDatePredictModel = joblib.load('models/duedate_prediction.pkl')
dueDateVectorizer = joblib.load('models/duedate_vectorizer.pkl')

@app.route('/process', methods=['POST'])
def process_data():
    data = request.json
    dueDateObj = []
    newletterObj = []
    for email in data:
        email_content = remove_html_tags(email['content'])
        new_text_vector = vectorizer.transform([email_content])
        predicted_category = clf.predict(new_text_vector)
        print("Predicted category: ")
        print(predicted_category)
        if predicted_category=="To-do" or predicted_category=="Registration":
            print("Email content to work on: "+email_content)
            dueDate = extract_due_date(email_content)
            todo_obj = {"id":email['id'],"subject":email['subject'],"content":email['content'],"due-date":dueDate,"predicted-category":predicted_category[0]}
            dueDateObj.append(todo_obj)

        elif predicted_category =="Newsletter":
            print("Going to sort them into Newletter folder")
            obj = {"id":email['id'],"subject":email['subject']}
            newletterObj.append(obj) 
    print('Returning results: ')
    print({"Newletter":newletterObj,"To-do":dueDateObj})
    return jsonify({"Newletter":newletterObj,"To-do":dueDateObj})


if __name__ == '__main__':
    app.run(debug=True)
