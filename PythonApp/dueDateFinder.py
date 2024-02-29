# import pandas as pd
# from sklearn.model_selection import train_test_split
# from sklearn.feature_extraction.text import TfidfVectorizer
# from sklearn.ensemble import RandomForestRegressor
# from sklearn.metrics import accuracy_score, mean_absolute_error
# import joblib
# from preprocessing import preprocess_email_text 

# # Load labeled dataset (email text and correct due date)
# df = pd.read_csv('trainingData/trainingDataset_dueDate.csv')
# df['processed_email_text'] = df['email_text'].apply(preprocess_email_text)
# df['correct_due_date'] = df['correct_due_date'].apply(preprocess_email_text)

# # Split dataset into features (email text) and labels (correct due date)
# X = df['processed_email_text']
# y = df['correct_due_date']

# X_train, X_valid, y_train, y_valid = train_test_split(X, y, test_size=0.1, random_state=42)
# print(X_train[0])
# print(y_train[0])
# # Extract features using TF-IDF vectorization
# tfidf_vectorizer = TfidfVectorizer(max_features=1000)
# X_train_tfidf = tfidf_vectorizer.fit_transform(X_train)
# X_valid_tfidf = tfidf_vectorizer.transform(X_valid)

# # Train a random forest classifier
# regressor = RandomForestRegressor(n_estimators=100, random_state=42)
# regressor.fit(X_train_tfidf, y_train)

# # Evaluate the model
# y_pred = regressor.predict(X_valid_tfidf)
# mae = mean_absolute_error(y_valid, y_pred)

# joblib.dump(regressor, 'models/duedate_prediction.pkl')  # Save the model to a file
# joblib.dump(tfidf_vectorizer, 'models/duedate_vectorizer.pkl')
# python -m spacy download en_core_web_sm
import datefinder
import spacy

# Load SpaCy's English language model
nlp = spacy.load('en_core_web_sm')

def extract_due_date(email_content):
    # Find all dates mentioned in the email content
    matches = datefinder.find_dates(email_content)
    dates = list(matches)

    # # Process the email content with SpaCy
    doc = nlp(email_content)
    # print(doc)
    # # Filter out dates that are part of common expressions (e.g., "last week", "next month")
    # filtered_dates = []
    # for date in dates:
    #     # Example: Check if the word "next" or "last" is in the same sentence as the date
    #     if ("next" in [token.text for token in date.doc]) or ("last" or [token.text for token in date.doc]) or ("deadline" not in [token.text for token in date.doc]) or ("complete by" not in [token.text for token in date.doc]):
    #         filtered_dates.append(date)

    # # If there are no filtered dates, return None
    # if not filtered_dates:
    #     return None
    # Find sentences containing the words "next" or "last"
    relevant_sentences = []
    for sent in doc.sents:
        if "next" in sent.text.lower() or "last" in sent.text.lower():
            relevant_sentences.append(sent.text)

    # Filter out dates that appear in relevant sentences
    filtered_dates = [date for date in dates if not any(sent in date.strftime('%B %d, %Y') for sent in relevant_sentences)]

    # If there are no filtered dates, return None
    if not filtered_dates:
        return None

    # Return the last filtered date (assuming it's the most relevant)
    return max(filtered_dates)

# Example usage
# email_content = "Please complete the task by February 28th, 2024. Thank you!"
# due_date = extract_due_date(email_content)
# if due_date:
#     print("Due date:", due_date)
# else:
#     print("No due date found in the email content.")

