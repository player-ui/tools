# Add parent folder to path
import os
import sys
currentdir = os.path.dirname(os.path.realpath(__file__))
parentdir = os.path.dirname(currentdir)
sys.path.append(parentdir)

import main

def test_example():
    assert main.main() == 'bar'