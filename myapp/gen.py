import os
import django
import random
from datetime import datetime, timedelta
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)
# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mybackend.settings")
django.setup()

from myapp.models import ClickData

# Define the date range
start_date = datetime(2020, 1, 1)
end_date = datetime(2024, 7, 31)

# Function to generate random click data
def generate_click_data():
    current_date = start_date
    delta = timedelta(days=1)

    while current_date <= end_date:
        for button in ['A', 'B', 'C']:
            # Generate a random number of clicks for each button
            count = random.randint(0, 200)
            ClickData.objects.create(button=button, timestamp=current_date, count=count)
        current_date += delta

    print("Data generation complete.")

if __name__ == "__main__":
    generate_click_data()
