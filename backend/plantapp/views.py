from django.shortcuts import render
from rest_framework import viewsets
from .models import Tree
from .serializers import TreeSerializer

class TreeViewSet(viewsets.ModelViewSet):
    queryset = Tree.objects.all()
    serializer_class = TreeSerializer