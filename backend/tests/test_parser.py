from app.services.parsers.python_parser import parse_python
from app.services.parsers.js_ts_parser import parse_js_ts
from app.services.parsers.java_parser import parse_java


# --- Python ---

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


def test_parse_python_calls():
    source = '''
def process():
    data = fetch_data()
    result = transform(data)
    obj.save(result)
    return result
'''
    result = parse_python(source, "test.py", "python")
    assert len(result.functions) == 1
    calls = result.functions[0].calls
    assert "fetch_data" in calls
    assert "transform" in calls
    assert "save" in calls


def test_parse_python_method_calls():
    source = '''
class Service:
    def run(self):
        data = self.load()
        self.process(data)
'''
    result = parse_python(source, "test.py", "python")
    methods = result.classes[0].methods
    assert len(methods) == 1
    assert "load" in methods[0].calls
    assert "process" in methods[0].calls


# --- JavaScript/TypeScript ---

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


def test_parse_js_calls():
    source = '''
function process() {
    const data = fetchData();
    const result = transform(data);
    console.log(result);
}
'''
    result = parse_js_ts(source, "test.js", "javascript")
    calls = result.functions[0].calls
    assert "fetchData" in calls
    assert "transform" in calls
    assert "log" in calls


# --- Java ---

def test_parse_java_classes():
    source = '''
import java.util.List;

public class Animal {
    public void speak() {}
}
'''
    result = parse_java(source, "Animal.java", "java")
    assert len(result.classes) == 1
    assert result.classes[0].name == "Animal"
    assert len(result.classes[0].methods) == 1
    assert result.classes[0].methods[0].name == "speak"


def test_parse_java_inheritance():
    source = '''
public class Dog extends Animal implements Serializable {
    public void speak() {
        System.out.println("Woof");
    }
}
'''
    result = parse_java(source, "Dog.java", "java")
    assert len(result.classes) == 1
    cls = result.classes[0]
    assert cls.name == "Dog"
    assert "Animal" in cls.bases


def test_parse_java_imports():
    source = '''
import java.util.List;
import java.io.File;
'''
    result = parse_java(source, "Test.java", "java")
    assert len(result.imports) == 2
    assert result.imports[0].module == "java.util"
    assert "List" in result.imports[0].names


def test_parse_java_calls():
    source = '''
public class App {
    public void run() {
        String name = getName();
        System.out.println(name);
        process(name);
    }
}
'''
    result = parse_java(source, "App.java", "java")
    methods = result.classes[0].methods
    assert len(methods) == 1
    calls = methods[0].calls
    assert "getName" in calls
    assert "println" in calls
    assert "process" in calls


def test_parse_java_interface():
    source = '''
public interface Printable {
    void print();
    String format(String data);
}
'''
    result = parse_java(source, "Printable.java", "java")
    assert len(result.classes) == 1
    assert result.classes[0].name == "Printable"
