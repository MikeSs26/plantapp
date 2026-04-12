from django.db import models
from django.contrib.auth.models import User

class Tree(models.Model):
    # Link to the user who planted it
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trees')
    
    # URL for the photo (later we can upgrade this to ImageField)
    photo_url = models.URLField(max_length=500)
    
    # Location coordinates
    latitude = models.DecimalField(max_digits=10, decimal_places=8)
    longitude = models.DecimalField(max_digits=11, decimal_places=8)
    
    # Tree metadata
    species = models.CharField(max_length=100, blank=True, null=True)
    planted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.species if self.species else 'Unknown Tree'} - {self.user.username}"