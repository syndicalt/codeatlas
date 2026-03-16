from app.services.parsers.python_parser import parse_python
from app.services.parsers.js_ts_parser import parse_js_ts


def test_parse_python_functions():
    source = '''
def hello():
    pass

def greet(name):
    return f"Hi {name}"
'''
    result = parse_python(source, "test.py", "python")
    assert len(result.functions) == 2
    assert result.functions[0].name == "hello"
    assert result.functions[1].name == "greet"


def test_parse_python_classes():
    source = '''
class Animal:
    def speak(self):
        pass

class Dog(Animal):
    def speak(self):
        return "Woof"
'''
    result = parse_python(source, "test.py", "python")
    assert len(result.classes) == 2
    assert result.classes[0].name == "Animal"
    assert result.classes[1].name == "Dog"
    assert result.classes[1].bases == ["Animal"]
    assert len(result.classes[1].methods) == 1


def test_parse_python_imports():
    source = '''
import os
from pathlib import Path
from collections import OrderedDict, defaultdict
'''
    result = parse_python(source, "test.py", "python")
    assert len(result.imports) == 3
    assert result.imports[0].module == "os"
    assert result.imports[1].module == "pathlib"


def test_parse_js_functions():
    source = '''
function hello() {}
const greet = (name) => `Hi ${name}`;
'''
    result = parse_js_ts(source, "test.js", "javascript")
    assert len(result.functions) == 2
    assert result.functions[0].name == "hello"
    assert result.functions[1].name == "greet"


def test_parse_js_classes():
    source = '''
class Animal {
    speak() {}
}
class Dog extends Animal {
    speak() { return "Woof"; }
}
'''
    result = parse_js_ts(source, "test.js", "javascript")
    assert len(result.classes) == 2
    assert result.classes[0].name == "Animal"
    assert result.classes[1].name == "Dog"


def test_parse_js_imports():
    source = '''
import React from 'react';
import { useState, useEffect } from 'react';
'''
    result = parse_js_ts(source, "test.js", "javascript")
    assert len(result.imports) == 2
    assert result.imports[0].module == "react"
