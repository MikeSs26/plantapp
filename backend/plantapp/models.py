from django.conf import settings
from django.db import models

class Tree(models.Model):
    # Link to the user who planted it
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='trees')

    # URL for the photo (later we can upgrade this to Cloudinary)
    photo_url = models.URLField(max_length=500, blank=True)
    
    # Location coordinates
    latitude = models.DecimalField(max_digits=10, decimal_places=8)
    longitude = models.DecimalField(max_digits=11, decimal_places=8)
    
    # Tree metadata
    species = models.CharField(max_length=100, blank=True, null=True)
    planted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.species if self.species else 'Unknown Tree'} - {self.user}"


class Like(models.Model):
    """Un 'me gusta' de un usuario a un árbol. Único por (usuario, árbol)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='likes'
    )
    tree = models.ForeignKey(Tree, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'tree')

    def __str__(self):
        return f"{self.user} ❤ {self.tree_id}"


class Comment(models.Model):
    """Comentario de un usuario sobre un árbol."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments'
    )
    tree = models.ForeignKey(Tree, on_delete=models.CASCADE, related_name='comments')
    text = models.TextField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.user} → árbol {self.tree_id}: {self.text[:30]}"