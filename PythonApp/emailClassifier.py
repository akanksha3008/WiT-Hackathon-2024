from sklearn.feature_extraction.text import CountVectorizer
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import classification_report
import pandas as pd
import joblib

# Sample dataset (replace with your own labeled data)
# 1. Read the training data
data = pd.read_csv('trainingData/trainingDataset_classification.csv')  # Replace 'training_data.csv' with your file name

# 3. Feature extraction
vectorizer = CountVectorizer()
X = vectorizer.fit_transform(data['Text'])
y = data['Category']

# 4. Split the data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 5. Choose a model
clf = MultinomialNB()  # Example: Naive Bayes classifier

# 6. Train the model
clf.fit(X_train, y_train)

# 7. Evaluate the model
y_pred = clf.predict(X_test)
print(classification_report(y_test, y_pred))

# 8. Use the model (for example, classify new text data)
new_text = ["Here are the latest updates"]
new_text_vector = vectorizer.transform(new_text)
predicted_category = clf.predict(new_text_vector)
print('Predicted category:', predicted_category)

# 7. Save the model to a file
joblib.dump(clf, 'models/classification_model.pkl')  # Save the model to a file

# Optionally, save the vectorizer as well
joblib.dump(vectorizer, 'models/vectorizer.pkl')