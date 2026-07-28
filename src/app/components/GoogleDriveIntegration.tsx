import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { 
  FileText, 
  Image as ImageIcon, 
  FolderOpen, 
  ExternalLink, 
  Plus, 
  Trash2,
  Eye,
  Edit,
  X,
  Check
} from "lucide-react";
import { Badge } from "./ui/badge";
import { toast } from "sonner";

interface GoogleDriveFile {
  id: string;
  name: string;
  url: string;
  type: "proposal" | "image" | "folder" | "document";
  thumbnailUrl?: string;
}

interface GoogleDriveIntegrationProps {
  files: GoogleDriveFile[];
  onAddFile: (file: GoogleDriveFile) => void;
  onRemoveFile: (id: string) => void;
  onUpdateFile?: (id: string, updates: Partial<GoogleDriveFile>) => void;
  isEditMode?: boolean;
  title?: string;
  description?: string;
}

export default function GoogleDriveIntegration({
  files = [],
  onAddFile,
  onRemoveFile,
  onUpdateFile,
  isEditMode = false,
  title = "Google Drive Files",
  description = "Proposals, images, and documents stored in Google Drive",
}: GoogleDriveIntegrationProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFile, setNewFile] = useState({
    name: "",
    url: "",
    type: "proposal" as GoogleDriveFile["type"],
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedFile, setEditedFile] = useState<Partial<GoogleDriveFile>>({});

  const handleAddFile = () => {
    if (!newFile.name.trim() || !newFile.url.trim()) {
      toast.error("Please provide both name and URL");
      return;
    }

    // Validate Google Drive URL
    if (!isValidGoogleDriveUrl(newFile.url)) {
      toast.error("Please provide a valid Google Drive URL");
      return;
    }

    const file: GoogleDriveFile = {
      id: Date.now().toString(),
      name: newFile.name,
      url: newFile.url,
      type: newFile.type,
      thumbnailUrl: extractThumbnailUrl(newFile.url, newFile.type),
    };

    onAddFile(file);
    setNewFile({ name: "", url: "", type: "proposal" });
    setShowAddForm(false);
    toast.success(`${newFile.type === "proposal" ? "Proposal" : "File"} added successfully`);
  };

  const handleStartEdit = (file: GoogleDriveFile) => {
    setEditingId(file.id);
    setEditedFile({ ...file });
  };

  const handleSaveEdit = (id: string) => {
    if (!onUpdateFile) return;
    
    if (!editedFile.name?.trim() || !editedFile.url?.trim()) {
      toast.error("Please provide both name and URL");
      return;
    }

    if (!isValidGoogleDriveUrl(editedFile.url)) {
      toast.error("Please provide a valid Google Drive URL");
      return;
    }

    onUpdateFile(id, {
      ...editedFile,
      thumbnailUrl: extractThumbnailUrl(editedFile.url, editedFile.type || "document"),
    });
    setEditingId(null);
    setEditedFile({});
    toast.success("File updated successfully");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedFile({});
  };

  const isValidGoogleDriveUrl = (url: string): boolean => {
    return (
      url.includes("drive.google.com") ||
      url.includes("docs.google.com") ||
      url.includes("sheets.google.com") ||
      url.includes("slides.google.com")
    );
  };

  const extractThumbnailUrl = (url: string, type: string): string | undefined => {
    // Extract file ID from various Google Drive URL formats
    const patterns = [
      /\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        const fileId = match[1];
        // Return thumbnail URL if it's an image
        if (type === "image") {
          return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
        }
        // Return preview URL for documents
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }
    return undefined;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "proposal":
        return FileText;
      case "image":
        return ImageIcon;
      case "folder":
        return FolderOpen;
      default:
        return FileText;
    }
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case "proposal":
        return "bg-primary/10 text-primary";
      case "image":
        return "bg-accent/10 text-accent";
      case "folder":
        return "bg-secondary text-secondary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const openInGoogleDrive = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const getPreviewUrl = (file: GoogleDriveFile): string | null => {
    if (file.type === "image" && file.thumbnailUrl) {
      return file.thumbnailUrl;
    }
    return null;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 
            className="uppercase text-muted-foreground" 
            style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-h4)' }}
          >
            {title}
          </h3>
          <p 
            className="text-muted-foreground mt-1" 
            style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
          >
            {description}
          </p>
        </div>
        {isEditMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add File
          </Button>
        )}
      </div>

      {/* Add File Form */}
      {showAddForm && isEditMode && (
        <Card className="p-4 mb-4 border-2 border-dashed border-primary/30 bg-primary/5">
          <div className="space-y-3">
            <div>
              <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
                File Name
              </Label>
              <Input
                placeholder="e.g., Kitchen Remodel Proposal"
                value={newFile.name}
                onChange={(e) => setNewFile({ ...newFile, name: e.target.value })}
                className="mt-1"
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
              />
            </div>
            <div>
              <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
                Google Drive URL
              </Label>
              <Input
                placeholder="https://drive.google.com/file/d/..."
                value={newFile.url}
                onChange={(e) => setNewFile({ ...newFile, url: e.target.value })}
                className="mt-1"
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
              />
              <p 
                className="text-muted-foreground mt-1" 
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
              >
                Paste the share link from Google Drive
              </p>
            </div>
            <div>
              <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
                File Type
              </Label>
              <div className="flex gap-2 mt-2">
                {["proposal", "image", "document", "folder"].map((type) => (
                  <Button
                    key={type}
                    variant={newFile.type === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewFile({ ...newFile, type: type as GoogleDriveFile["type"] })}
                    style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleAddFile}
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
              >
                <Check className="w-4 h-4 mr-2" />
                Add File
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setNewFile({ name: "", url: "", type: "proposal" });
                }}
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Files List */}
      <div className="space-y-3">
        {files.length === 0 ? (
          <div className="text-center py-8">
            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p 
              className="text-muted-foreground" 
              style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
            >
              No files added yet
            </p>
            {isEditMode && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setShowAddForm(true)}
                className="mt-2"
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
              >
                Add your first file
              </Button>
            )}
          </div>
        ) : (
          files.map((file) => {
            const Icon = getFileIcon(file.type);
            const isEditing = editingId === file.id;
            const displayFile = isEditing ? { ...file, ...editedFile } : file;

            return (
              <Card key={file.id} className="p-4 hover:shadow-md transition-shadow">
                {isEditing ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <div>
                      <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
                        File Name
                      </Label>
                      <Input
                        value={editedFile.name || ""}
                        onChange={(e) => setEditedFile({ ...editedFile, name: e.target.value })}
                        className="mt-1"
                        style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
                      />
                    </div>
                    <div>
                      <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
                        Google Drive URL
                      </Label>
                      <Input
                        value={editedFile.url || ""}
                        onChange={(e) => setEditedFile({ ...editedFile, url: e.target.value })}
                        className="mt-1"
                        style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
                      />
                    </div>
                    <div>
                      <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
                        File Type
                      </Label>
                      <div className="flex gap-2 mt-2">
                        {["proposal", "image", "document", "folder"].map((type) => (
                          <Button
                            key={type}
                            variant={editedFile.type === type ? "default" : "outline"}
                            size="sm"
                            onClick={() => setEditedFile({ ...editedFile, type: type as GoogleDriveFile["type"] })}
                            style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSaveEdit(file.id)}
                        style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                        style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Display Mode
                  <div className="flex items-start gap-4">
                    {/* Thumbnail/Icon */}
                    <div className="flex-shrink-0">
                      {getPreviewUrl(file) ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-border">
                          <img
                            src={getPreviewUrl(file)!}
                            alt={file.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to icon if image fails to load
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      ) : (
                        <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${getFileTypeColor(file.type)}`}>
                          <Icon className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 
                            className="truncate mb-1" 
                            style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h4)', fontVariationSettings: "'wdth' 137", fontWeight: 700 }}
                          >
                            {displayFile.name}
                          </h4>
                          <Badge className={`${getFileTypeColor(file.type)} mb-2`}>
                            {file.type}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openInGoogleDrive(file.url)}
                            title="Open in Google Drive"
                            style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          {isEditMode && onUpdateFile && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEdit(file)}
                              title="Edit"
                              style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {isEditMode && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Remove "${file.name}" from this client?`)) {
                                  onRemoveFile(file.id);
                                  toast.success("File removed");
                                }
                              }}
                              className="text-destructive hover:text-destructive"
                              title="Remove"
                              style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p 
                        className="text-muted-foreground truncate mt-1" 
                        style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                      >
                        {file.url}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </Card>
  );
}

export type { GoogleDriveFile };
