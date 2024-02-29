import datetime
from dateutil.parser import parse
import re

def preprocess_email_text(text):
    current_year = datetime.datetime.now().year

    # Regular expression patterns to match different date formats
    date_patterns = [
        r'\d{1,2}[/]\d{1,2}[/]\d{4}\b',       # Match dates in the format "12/03/2024"
        r'\d{1,2}-\d{1,2}-\d{4}',  # Match dates in the format "12-03-2024"
        r'\b\d{1,2}\s(?:January|February|March|April|May|June|July|August|September|October|November|December)\s\d{4}\b',  # Match dates like "12 March 2024"
        r'\b\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{4}\b',  # Match dates like "12 Mar 2024"
        r'\b\d{1,2}\s(?:January|February|March|April|May|June|July|August|September|October|November|December)\b',  # Match dates like "12 March"
        r'\b\d{1,2}(?:st|nd|rd|th)\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b'  # Match dates like "12th Mar"
        r'\d{1,2}(?:st|nd|rd|th)\s(?:January|February|March|April|May|June|July|August|September|October|November|December)'  # Match dates like "12th March"
   ]

    # Function to convert matched date strings to datetime objects
    def convert_to_datetime(match):
        try:
            date_str = match.group(0)
            print("date_str: ")
            print(date_str)
            if len(date_str.split()) == 2:
                date_str += " " + str(current_year)
            parsed_date = parse(date_str, fuzzy=True)
            print("Parsed date: ")
            print(parsed_date)
            # If parsed date is in the past, increment year by 1
            if parsed_date.year < current_year:
                parsed_date = parsed_date.replace(year=parsed_date.year + 1)
            return parsed_date.toordinal() 
        except Exception as e:
            print("Error occurred during date parsing:", e)
            return None

    # Replace matched date patterns in the text with datetime objects
    processed_text = text
    for pattern in date_patterns:
        processed_text = re.sub(pattern, lambda x: str(convert_to_datetime(x)), processed_text)
    print("Processed text = "+processed_text)
    return processed_text


def remove_html_tags(html_text):
    print("Removing html tag from email content: "+html_text)
    # Define the regular expression pattern to match HTML tags
    html_tag_pattern = re.compile(r'<[^>]+>')

    # Use the sub() function to remove HTML tags from the text
    cleaned_text = re.sub(html_tag_pattern, '', html_text)
    print("After cleaning..."+cleaned_text)
    return cleaned_text